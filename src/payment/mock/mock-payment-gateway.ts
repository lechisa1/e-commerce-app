import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export interface MockPaymentRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardHolderName: string;
}

export interface MockPaymentResponse {
  success: boolean;
  transactionId: string;
  message: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  metadata?: any;
}

@Injectable()
export class MockPaymentGateway {
  private readonly VALID_CARDS = {
    '4242424242424242': { type: 'VISA', status: 'success' },
    '5555555555554444': { type: 'MASTERCARD', status: 'success' },
    '378282246310005': { type: 'AMEX', status: 'success' },
    '4000000000000002': {
      type: 'VISA',
      status: 'failed',
      reason: 'Insufficient funds',
    },
    '4000000000000069': {
      type: 'VISA',
      status: 'pending',
      reason: 'Requires 3D secure',
    },
  };

  async processPayment(
    request: MockPaymentRequest,
  ): Promise<MockPaymentResponse> {
    // Simulate network delay
    await this.delay(1500);

    const cardInfo = this.VALID_CARDS[request.cardNumber];

    if (!cardInfo) {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        message: 'Invalid card number',
        status: 'FAILED',
      };
    }

    // Validate expiry date
    if (!this.isValidExpiryDate(request.expiryDate)) {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        message: 'Card has expired',
        status: 'FAILED',
      };
    }

    // Validate CVV
    if (!this.isValidCVV(request.cvv)) {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        message: 'Invalid CVV',
        status: 'FAILED',
      };
    }

    // Process based on card status
    if (cardInfo.status === 'failed') {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        message: cardInfo.reason || 'Payment failed',
        status: 'FAILED',
      };
    }

    if (cardInfo.status === 'pending') {
      return {
        success: false,
        transactionId: this.generateTransactionId(),
        message: 'Payment requires 3D secure verification',
        status: 'PENDING',
        metadata: { requires3DS: true },
      };
    }

    // Successful payment
    return {
      success: true,
      transactionId: this.generateTransactionId(),
      message: 'Payment processed successfully',
      status: 'SUCCEEDED',
      metadata: {
        last4: request.cardNumber.slice(-4),
        cardType: cardInfo.type,
        expiryDate: request.expiryDate,
        cardHolderName: request.cardHolderName,
      },
    };
  }

  async processRefund(
    transactionId: string,
    amount?: number,
  ): Promise<MockPaymentResponse> {
    await this.delay(1000);

    return {
      success: true,
      transactionId: this.generateTransactionId(),
      message: `Refund of ${amount ? '$' + amount : 'full amount'} processed successfully`,
      status: 'SUCCEEDED',
      metadata: {
        originalTransactionId: transactionId,
        refundAmount: amount,
        refundDate: new Date().toISOString(),
      },
    };
  }

  async getPaymentStatus(transactionId: string): Promise<MockPaymentResponse> {
    await this.delay(500);

    return {
      success: true,
      transactionId,
      message: 'Payment status retrieved',
      status: 'SUCCEEDED',
    };
  }

  private generateTransactionId(): string {
    const prefix = 'MOCK';
    const timestamp = Date.now().toString().slice(-8);
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  private isValidExpiryDate(expiryDate: string): boolean {
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month), 1);
    return expiry > new Date();
  }

  private isValidCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
