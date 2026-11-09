# SIAC Monitor — Frontend

Interfaz web de la herramienta para el seguimiento del **Sistema Interno de Aseguramiento de la Calidad (SIAC)** de la Universidad Cooperativa de Colombia, campus Pasto. Consume la API de [`siac-backend`](../siac-backend).

Trabajo de grado — Ingeniería de Software: Ubeimar Lizardo Yepes Portilla, Juan Pablo Lucero Morales y Sebastián José Rojas Betancourth.

## Tecnologías

React 19 + TypeScript + Vite, Tailwind CSS 4, React Router, TanStack Query, Recharts y Lucide.

## Pantallas

Inicio de sesión · Panel del campus (indicadores clave, riesgo por programa, mapa de calor programas × factores, cumplimiento por responsable, filtros por programa, periodo, factor y responsable) · Programas y detalle con semáforo por factor · Indicadores (listado, formulario, importación Excel) y detalle (gráfico histórico, registro de valores, desglose del riesgo, historial de cambios) · Evidencias (carga por archivo o enlace con vigencia, solicitudes con fecha límite, validación, pre-revisión con IA) · Centro de alertas (atender, descartar, crear plan, sugerir plan con IA) · Planes de mejoramiento · Reportes PDF/Excel con resumen ejecutivo con IA · Asistente IA · Configuración de alertas (global y por programa) · Usuarios · Bitácora · Perfil.

La interfaz es responsiva (escritorio, tableta y móvil) y muestra a cada perfil solo las acciones que puede realizar.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173 (proxy /api → http://localhost:8000)
npm run build
npm run lint
```

## Despliegue

Variable de compilación: `VITE_API_URL` = URL pública de la API (sin `/api`).

- **Vercel / Netlify:** comando `npm run build`, carpeta `dist`. `vercel.json` incluye la redirección de rutas a `index.html`.
- **Docker + Nginx:** `docker build --build-arg VITE_API_URL=https://api.tu-dominio.com -t siac-frontend .`
