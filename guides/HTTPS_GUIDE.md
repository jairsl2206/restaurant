# Guía Completa: Implementación de HTTPS (Candado Verde) 🔒

Para que tus clientes vean el sitio como "Seguro", tienes tres opciones principales. Elige la que mejor se adapte a tu situación.

---

## Opción 1: Cloudflare Tunnel (⭐ Recomendada)
Esta opción es **gratuita**, te da una dirección web real (ej. `turestaurante.trycloudflare.com`) y **no requiere abrir puertos** en tu router. Es la más segura y fácil para compartir el menú con clientes fuera de tu red local.

1.  **Descargar Cloudflared:**
    -   Ve a [Cloudflare Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) y descarga la versión de Windows.
    -   Guárdalo en una carpeta conocida.

2.  **Iniciar el Túnel:**
    -   Abre una terminal (PowerShell o CMD).
    -   Ejecuta el siguiente comando (asegúrate de que tu sistema ya esté corriendo en el puerto 3001):
        ```powershell
        ./cloudflared tunnel --url http://localhost:3001
        ```

3.  **Resultado:**
    -   La terminal te mostrará un enlace parecido a: `https://slap-chop-random-word.trycloudflare.com`.
    -   **¡Listo!** Comparte ese enlace. Tus clientes verán el candado verde automáticamente. No necesitas configurar nada más en el código.

---

## Opción 2: Certificados Locales (Para Red Local / WiFi)
Si solo vas a usar el sistema dentro de tu restaurante (conectado al mismo WiFi) y no quieres salir a internet.

> **Advertencia:** Los dispositivos nuevos (Android/iPhone) mostrarán una advertencia de "Sitio no seguro" la primera vez porque el certificado es "auto-firmado" (creado por ti, no por una autoridad mundial).

1.  **Generar Certificados:**
    -   Necesitas una herramienta como `OpenSSL` o `mkcert`.
    -   Si tienes git bash, puedes correr:
        ```bash
        openssl req -nodes -new -x509 -keyout server/ssl/server.key -out server/ssl/server.cert
        ```
    -   O visita [zerossl.com](https://zerossl.com) para generar uno gratis, descarga los archivos y renómbralos a `server.key` y `server.cert`.

2.  **Instalar en el Servidor:**
    -   Copa los archivos `server.key` y `server.cert` en la carpeta `server/ssl/` de tu proyecto.
    -   Reinicia tu servidor (`restart.bat`).
    -   El sistema detectará automáticamente los archivos y habilitará HTTPS.
    -   Accede vía `https://TU_IP_LOCAL:3001`.

---

## Opción 3: Dominio Real + VPS (Profesional)
Si decides contratar un servidor en la nube (AWS, DigitalOcean, etc.) y un dominio (`mirestaurante.com`).

1.  Apunta tu dominio a la IP de tu servidor.
2.  Usa **Certbot** (Let's Encrypt) para generar certificados automáticos y gratuitos.
3.  Configura un "Reverse Proxy" (Nginx) que maneje la seguridad y pase los datos a tu aplicación Node.js.

*Esta opción requiere conocimientos de administración de servidores Linux.*
