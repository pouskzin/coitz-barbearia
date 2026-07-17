export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  // Formatting phone number (removing non-digits)
  const cleanPhone = phone.replace(/\D/g, '');

  if (!apiUrl || !apiToken) {
    console.log(`[WHATSAPP MOCK] To: ${cleanPhone}`);
    console.log(`[WHATSAPP MOCK] Message:\n${message}\n`);
    console.log(`[WHATSAPP MOCK] Configure WHATSAPP_API_URL e WHATSAPP_API_TOKEN no .env para envios reais.`);
    return true;
  }

  try {
    // Exemplo de integração genérica com API Rest de WhatsApp (como Z-API, Evolution API, etc)
    const response = await fetch(`${apiUrl}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message
      })
    });

    if (!response.ok) {
      console.error(`[WHATSAPP ERROR] Falha ao enviar: ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[WHATSAPP ERROR] Exceção ao enviar:`, error);
    return false;
  }
};
