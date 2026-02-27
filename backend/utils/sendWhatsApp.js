import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a WhatsApp message using Twilio
 * @param {string} to - Recipient phone number (with country code, e.g. +91XXXXXXXXXX)
 * @param {string} message - Message body
 */
export const sendWhatsAppMessage = async (to, message) => {
  try {
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`,
    });
    console.log(`WhatsApp message sent: ${msg.sid}`);
    return msg;
  } catch (error) {
    console.error("Twilio WhatsApp error:", error.message);
    throw error;
  }
};
