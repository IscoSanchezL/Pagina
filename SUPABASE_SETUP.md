# Guía de Configuración de Supabase para ClassPlanner

## 📋 Pasos para Configurar Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa la información:
   - **Name**: ClassPlanner
   - **Database Password**: Genera una contraseña segura
   - **Region**: Selecciona la región más cercana
5. Haz clic en "Create new project"

### 2. Configurar la Base de Datos

1. Ve a **SQL Editor** en el panel lateral
2. Copia y pega el contenido completo del archivo `supabase-schema.sql`
3. Haz clic en **Run** para ejecutar el script
4. Verifica que todas las tablas se crearon correctamente

### 3. Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL** (ejemplo: `https://xyzcompany.supabase.co`)
   - **anon public** key (clave pública)

### 4. Configurar el Proyecto Local

1. Abre el archivo `supabase-config.js`
2. Reemplaza los valores:

```javascript
const SUPABASE_CONFIG = {
    url: 'TU_PROJECT_URL_AQUI', // Ejemplo: 'https://xyzcompany.supabase.co'
    anonKey: 'TU_ANON_KEY_AQUI', // Tu clave pública de Supabase
};
```

### 5. Configurar Autenticación

1. Ve a **Authentication** → **Settings**
2. En **Site URL**, agrega: `http://localhost:3000` (para desarrollo)
3. En **Redirect URLs**, agrega: `http://localhost:3000`
4. Para producción, reemplaza con tu dominio real

### 6. Configurar Políticas de Seguridad (RLS)

Las políticas ya están incluidas en el esquema SQL, pero puedes verificarlas en:
- **Authentication** → **Policies**

### 7. Probar la Conexión

1. Abre `index-new.html` en tu navegador
2. Deberías ver el modal de autenticación
3. Crea una cuenta de prueba
4. Verifica que los datos se guarden en Supabase

## 🔧 Funcionalidades Implementadas

### ✅ Autenticación
- Registro de usuarios
- Inicio de sesión
- Cierre de sesión
- Perfiles de usuario

### ✅ Sincronización de Datos
- Clases/Planeaciones
- Años escolares
- Días no lectivos
- Configuración de ciclos

### ✅ Modo Offline
- Almacenamiento local como respaldo
- Sincronización automática cuando vuelve la conexión
- Cola de sincronización

### ✅ Seguridad
- Row Level Security (RLS)
- Políticas de acceso por usuario
- Autenticación JWT

## 📊 Estructura de la Base de Datos

### Tablas Principales:
- **profiles**: Información de usuarios
- **school_years**: Años escolares
- **classes**: Planeaciones de clases
- **non_school_days**: Días no lectivos
- **month_cycle_config**: Configuración de ciclos por mes
- **custom_cycle_days**: Días de ciclo personalizados

## 🚀 Despliegue en Producción

### 1. Configurar Dominio
1. En Supabase, ve a **Authentication** → **Settings**
2. Actualiza **Site URL** y **Redirect URLs** con tu dominio
3. Actualiza `supabase-config.js` con las credenciales de producción

### 2. Variables de Entorno (Recomendado)
Para mayor seguridad, usa variables de entorno:

```javascript
const SUPABASE_CONFIG = {
    url: process.env.REACT_APP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
};
```

### 3. HTTPS Obligatorio
- Supabase requiere HTTPS en producción
- Configura SSL en tu servidor web

## 🔍 Monitoreo y Mantenimiento

### 1. Dashboard de Supabase
- Monitorea el uso de la base de datos
- Revisa logs de autenticación
- Verifica métricas de rendimiento

### 2. Backup Automático
- Supabase hace backups automáticos
- Configura backups adicionales si es necesario

### 3. Actualizaciones
- Mantén actualizada la librería de Supabase
- Revisa cambios en la API

## 🆘 Solución de Problemas

### Error de Conexión
1. Verifica las credenciales en `supabase-config.js`
2. Confirma que el proyecto esté activo en Supabase
3. Revisa la consola del navegador para errores

### Error de Autenticación
1. Verifica las URLs en Authentication Settings
2. Confirma que RLS esté habilitado
3. Revisa las políticas de seguridad

### Error de Sincronización
1. Verifica la conexión a internet
2. Revisa los logs en Supabase Dashboard
3. Confirma que las tablas existan

## 📞 Soporte

- **Documentación Supabase**: [docs.supabase.com](https://docs.supabase.com)
- **Comunidad**: [github.com/supabase/supabase](https://github.com/supabase/supabase)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)



