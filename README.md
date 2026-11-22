# VAMPI AI STUDIO

Versión 1.1: frontend responsive, backend Node.js + Express, contador online Socket.IO, subida/descarga de modelos 3D y base de datos SQLite para reportes y registro de archivos.

## Activar la IA real
1. Instala Node.js 18 o superior (recomendado Node 20+).
2. En la carpeta del proyecto ejecuta `npm install`.
3. Copia `.env.example` a `.env`.
4. Añade tu clave API en `OPENAI_API_KEY` dentro de `.env`. No compartas esa clave ni la pegues en el navegador.
5. Ejecuta `npm start` y abre `http://localhost:3000`.

La API de IA puede generar cargos según el uso y requiere una cuenta de API con facturación configurada. La clave se crea y administra desde la plataforma oficial de OpenAI. No incluyas la clave en repositorios públicos.

## Base de datos
SQLite crea `vampi.sqlite` automáticamente al iniciar. Guarda reportes y metadatos de archivos. Los modelos se guardan en `uploads/`.

## Publicar en internet
Todavía debes desplegar el proyecto en un hosting que soporte Node.js y almacenamiento persistente. En el hosting configura las variables `OPENAI_API_KEY` y `OPENAI_MODEL`, HTTPS y copias de seguridad. No puedo iniciar sesión ni publicar en una cuenta de hosting por ti.

## Pendiente para producción
Añadir autenticación, protección contra abuso, escaneo de archivos, límites por usuario, almacenamiento de objetos y política de privacidad. El contador actual mide conexiones simultáneas al servidor. El estado FULL indica el estado de esta web, no el estado de Free Fire.

La aplicación es para herramientas creativas, programación general y proyectos 3D. No modifica Free Fire ni crea aimbots, trampas o mecanismos para evadir sistemas antitrampas.
