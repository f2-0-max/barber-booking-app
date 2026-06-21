/**
 * SMS/WhatsApp Service for sending OTP codes
 * 
 * IMPLEMENTATION NOTES:
 * - In development: OTP codes are logged to console for testing
 * - In production: Integrate with your SMS provider (Twilio, AWS SNS, etc.)
 * - This service provides a wrapper for easy integration
 */

import { callDataApi } from "./dataApi";

export type SendOtpOptions = {
  phoneNumber: string;
  code: string;
  language?: "ar" | "en" | "tr";
};

/**
 * Send OTP code via SMS or WhatsApp
 * @param options - Phone number, OTP code, and optional language
 * @returns true if sent successfully, false otherwise
 */
export async function sendOtpCode(options: SendOtpOptions): Promise<boolean> {
  const { phoneNumber, code, language = "ar" } = options;

  try {
    // Format phone number (remove spaces and special characters)
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    // Prepare message based on language
    const messages: Record<string, string> = {
      ar: `رمز التحقق الخاص بك: ${code}\nصالح لمدة 10 دقائق فقط`,
      en: `Your verification code is: ${code}\nValid for 10 minutes only`,
      tr: `Doğrulama kodunuz: ${code}\nSadece 10 dakika geçerlidir`,
    };

    const message = messages[language] || messages.ar;

    // DEVELOPMENT MODE: Log OTP to console for testing
    if (process.env.NODE_ENV === "development") {
      console.log(`\n${"=".repeat(50)}`);
      console.log(`[OTP] Development Mode - OTP Code for ${phoneNumber}:`);
      console.log(`[OTP] Code: ${code}`);
      console.log(`[OTP] Message: ${message}`);
      console.log(`${"=".repeat(50)}\n`);
      return true;
    }

    // PRODUCTION MODE: Try to send via SMS/WhatsApp
    console.log(`[SMS] Attempting to send OTP to ${phoneNumber}`);
    
    // Try SMS first
    try {
      const result = await callDataApi("Messaging/SendSMS", {
        body: {
          phone_number: cleanPhone,
          message: message,
        },
      });

      if (result && typeof result === "object") {
        const apiResult = result as Record<string, unknown>;
        if (apiResult.success === true || apiResult.status === "sent" || apiResult.code === 0) {
          console.log(`[SMS] OTP sent successfully to ${phoneNumber}`);
          return true;
        }
      }
    } catch (smsError) {
      console.warn(`[SMS] SMS delivery failed:`, smsError);
    }

    // Try WhatsApp as fallback
    try {
      console.log(`[WhatsApp] Attempting WhatsApp delivery for ${phoneNumber}`);
      const whatsappResult = await callDataApi("Messaging/SendWhatsApp", {
        body: {
          phone_number: cleanPhone,
          message: message,
        },
      });

      if (whatsappResult && typeof whatsappResult === "object") {
        const apiResult = whatsappResult as Record<string, unknown>;
        if (apiResult.success === true || apiResult.status === "sent" || apiResult.code === 0) {
          console.log(`[WhatsApp] OTP sent successfully to ${phoneNumber}`);
          return true;
        }
      }
    } catch (waError) {
      console.warn(`[WhatsApp] WhatsApp delivery failed:`, waError);
    }

    console.error(`[SMS/WhatsApp] Failed to send OTP to ${phoneNumber}`);
    return false;
  } catch (error) {
    console.error(`[SMS/WhatsApp] Unexpected error:`, error);
    return false;
  }
}

/**
 * Send custom SMS message
 * @param phoneNumber - Recipient phone number
 * @param message - Message content
 * @returns true if sent successfully, false otherwise
 */
export async function sendSmsMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    if (process.env.NODE_ENV === "development") {
      console.log(`[SMS] Development mode: ${message} would be sent to ${phoneNumber}`);
      return true;
    }

    const result = await callDataApi("Messaging/SendSMS", {
      body: {
        phone_number: cleanPhone,
        message: message,
      },
    });

    if (result && typeof result === "object") {
      const apiResult = result as Record<string, unknown>;
      if (apiResult.success === true || apiResult.status === "sent" || apiResult.code === 0) {
        console.log(`[SMS] Message sent successfully to ${phoneNumber}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`[SMS] Error sending message to ${phoneNumber}:`, error);
    return false;
  }
}

/**
 * Send WhatsApp message
 * @param phoneNumber - Recipient phone number
 * @param message - Message content
 * @returns true if sent successfully, false otherwise
 */
export async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    if (process.env.NODE_ENV === "development") {
      console.log(`[WhatsApp] Development mode: ${message} would be sent to ${phoneNumber}`);
      return true;
    }

    const result = await callDataApi("Messaging/SendWhatsApp", {
      body: {
        phone_number: cleanPhone,
        message: message,
      },
    });

    if (result && typeof result === "object") {
      const apiResult = result as Record<string, unknown>;
      if (apiResult.success === true || apiResult.status === "sent" || apiResult.code === 0) {
        console.log(`[WhatsApp] Message sent successfully to ${phoneNumber}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`[WhatsApp] Error sending message to ${phoneNumber}:`, error);
    return false;
  }
}
