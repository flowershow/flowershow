// eslint-disable-next-line @typescript-eslint/no-require-imports
const brevo = require("@getbrevo/brevo");
import { env } from "@/env.mjs";

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  env.BREVO_API_KEY,
);

export async function sendWelcomeEmail(email: string, name?: string) {
  if (!env.BREVO_WELCOME_TEMPLATE_ID) {
    return;
  }

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.templateId = env.BREVO_WELCOME_TEMPLATE_ID;
    sendSmtpEmail.to = [{ email, name }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return result;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}
