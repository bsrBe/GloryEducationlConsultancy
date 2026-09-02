import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VerificationResult {
  verified: boolean;
  reason?: string;
  providerKey?: string;
  receiptNo?: string;
  amount?: number;
  receiverName?: string;
  payerName?: string;
  receiptUrl?: string;
  paymentDate?: string;
  rawReceipt?: any;
}

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Auto-constructs the target payload for links.et based on the user's chosen bank/wallet.
   */
  constructTarget(
    provider: string,
    rawInput: string,
  ): { url?: string; reference?: string } {
    const input = (rawInput || '').trim();
    if (!input) return {};

    // 1. If the user already provided a full URL, pass it directly
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return { url: input };
    }

    const prov = (provider || '').toLowerCase().trim();

    // 2. Telebirr: support transaction code (e.g. DB12345678)
    if (prov === 'telebirr') {
      return {
        url: `https://transactioninfo.ethiotelecom.et/receipt/${input}`,
        reference: input,
      };
    }

    // 3. Commercial Bank of Ethiopia (CBE)
    // CBE receipts are accessible via mbreciept.cbe.com.et/<id-or-token>
    if (prov === 'cbe') {
      return {
        url: `https://mbreciept.cbe.com.et/${input}`,
      };
    }

    // 4. Bank of Abyssinia (BOA)
    // Abyssinia receipts are accessible via cs.bankofabyssinia.com/slip/?trx=<TOKEN>
    if (prov === 'boa' || prov === 'abyssinia') {
      return {
        url: `https://cs.bankofabyssinia.com/slip/?trx=${input}`,
      };
    }

    // 5. Default fallback: if input starts with "FT", determine between BOA or CBE, else telebirr
    if (input.startsWith('FT')) {
      if (input.includes('-')) {
        return { url: `https://mbreciept.cbe.com.et/${input}` };
      }
      return { url: `https://cs.bankofabyssinia.com/slip/?trx=${input}` };
    }

    // Default to Telebirr reference
    return {
      reference: input,
      url: `https://transactioninfo.ethiotelecom.et/receipt/${input}`,
    };
  }

  /**
   * Verifies the receipt with links.et, checks status, parses amount and validates receiver name.
   */
  async verifyReceipt(
    provider: string,
    referenceOrUrl: string,
  ): Promise<VerificationResult> {
    const apiKey = this.configService.get<string>('LINKS_ET_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'LINKS_ET_API_KEY is not configured in .env. Payment will remain Pending for manual review.',
      );
      return {
        verified: false,
        reason:
          'Payment verification gateway API key is not configured. Saved for manual review.',
      };
    }

    const target = this.constructTarget(provider, referenceOrUrl);
    if (!target.url && !target.reference) {
      return {
        verified: false,
        reason: 'Invalid receipt link or reference number provided.',
      };
    }

    const payload: Record<string, any> = {
      waitMs: 5000,
    };
    if (target.url) payload.url = target.url;
    if (target.reference && !target.url) payload.reference = target.reference;

    try {
      this.logger.log(
        `Submitting verification to links.et for provider ${provider}: ${JSON.stringify(payload)}`,
      );

      let response = await fetch('https://links.et/api/verify', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let data: any = await response.json().catch(() => null);

      // Handle async 202 queued response with short polling (up to 2 attempts)
      if (response.status === 202 && data?.requestId) {
        this.logger.log(
          `Request queued (202). Polling links.et for requestId ${data.requestId}...`,
        );
        for (let i = 0; i < 2; i++) {
          await new Promise((res) => setTimeout(res, 2500));
          const pollRes = await fetch(
            `https://links.et/api/verify/${data.requestId}`,
            {
              headers: { 'x-api-key': apiKey },
            },
          );
          if (pollRes.ok) {
            const pollData = await pollRes.json().catch(() => null);
            if (
              pollData &&
              (pollData.processingStatus === 'completed' || pollData.ok)
            ) {
              data = pollData;
              response = pollRes;
              break;
            }
          }
        }
      }

      if (!response.ok || !data || data.ok !== true || !data.receipt) {
        const errorMsg =
          data?.error?.message ||
          data?.error ||
          'Receipt could not be verified by the banking network.';
        this.logger.warn(`Verification failed: ${errorMsg}`);
        return {
          verified: false,
          reason: errorMsg,
          receiptUrl: target.url,
        };
      }

      const receipt = data.receipt;

      // 1. Transaction status check
      const statusRaw = (
        receipt.transactionStatus ||
        receipt.upstreamStatus ||
        ''
      ).toLowerCase();
      const isCompleted =
        !statusRaw ||
        statusRaw.includes('complete') ||
        statusRaw.includes('success');
      if (!isCompleted) {
        return {
          verified: false,
          reason: `Transaction status is '${receipt.transactionStatus || receipt.upstreamStatus}', not completed.`,
          receiptUrl: target.url,
          rawReceipt: receipt,
        };
      }

      // 2. Extract and cross-check amount
      const extractedAmount = this.extractNumericAmount(receipt);
      const minExpectedAmount = Number(
        this.configService.get('PAYMENT_EXPECTED_AMOUNT') || 500,
      );

      if (extractedAmount < minExpectedAmount) {
        return {
          verified: false,
          amount: extractedAmount,
          reason: `Payment amount (${extractedAmount} ETB) is less than required minimum of ${minExpectedAmount} ETB.`,
          receiptUrl: target.url,
          rawReceipt: receipt,
        };
      }

      // 3. Extract and cross-check receiver name
      const extractedReceiver = this.extractReceiverName(receipt);
      const expectedReceiver =
        this.configService.get<string>('PAYMENT_RECEIVER_NAME') ||
        'Glory Educational Consultancy';

      const receiverMatched = this.checkReceiverMatch(
        extractedReceiver,
        expectedReceiver,
      );
      if (!receiverMatched) {
        this.logger.warn(
          `Receiver mismatch: got '${extractedReceiver}', expected '${expectedReceiver}'`,
        );
        return {
          verified: false,
          amount: extractedAmount,
          receiverName: extractedReceiver,
          reason: `Receipt credited party ('${extractedReceiver || 'Unknown'}') does not match expected account holder ('${expectedReceiver}').`,
          receiptUrl: target.url,
          rawReceipt: receipt,
        };
      }

      // 4. Extract receipt identifier
      const receiptNo =
        receipt.receiptNo ||
        receipt.reference ||
        receipt.transactionReference ||
        receipt.transaction?.reference ||
        target.reference ||
        referenceOrUrl;

      const payerName =
        receipt.payerName ||
        receipt.customerName ||
        receipt.customer?.customerName ||
        '';

      const paymentDate =
        receipt.paymentDate ||
        receipt.transactionDate ||
        receipt.date ||
        new Date().toISOString();

      return {
        verified: true,
        amount: extractedAmount,
        receiptNo,
        receiverName: extractedReceiver,
        payerName,
        providerKey: data.providerKey,
        receiptUrl: data.resolvedUrl || target.url,
        paymentDate,
        rawReceipt: receipt,
      };
    } catch (err: any) {
      this.logger.error(`Error during payment verification: ${err.message}`, err.stack);
      return {
        verified: false,
        reason: `Network error verifying receipt: ${err.message}`,
        receiptUrl: target.url,
      };
    }
  }

  /**
   * Robustly extracts amount as a numeric float across all Ethiopian provider receipt formats.
   */
  extractNumericAmount(receipt: any): number {
    const raw =
      receipt.transferredAmount ??
      receipt.totalAmount ??
      receipt.settledAmount ??
      receipt.totalPaidAmount ??
      receipt.transaction?.amount ??
      receipt.amount;

    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  /**
   * Extracts the receiver / credited party name across all supported banks.
   */
  extractReceiverName(receipt: any): string {
    return (
      receipt.creditedPartyName ||
      receipt.receiverName ||
      receipt.recipientName ||
      receipt.transaction?.beneficiaryName ||
      receipt.customer?.customerName ||
      ''
    ).trim();
  }

  /**
   * Intelligent normalized comparison between receipt receiver and configured merchant name.
   */
  checkReceiverMatch(actual: string, expected: string): boolean {
    if (!actual || !expected) return false;

    const normActual = actual.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const normExpected = expected.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // 1. Direct or containment match
    if (normActual.includes(normExpected) || normExpected.includes(normActual)) {
      return true;
    }

    // 2. Token / word overlap match
    const actualWords = new Set(normActual.split(/\s+/).filter(Boolean));
    const expectedWords = normExpected.split(/\s+/).filter(Boolean);
    if (expectedWords.length === 0) return false;

    const matchingWords = expectedWords.filter((w) => actualWords.has(w));
    // At least 66% of the expected words are present
    return matchingWords.length / expectedWords.length >= 0.66;
  }
}
