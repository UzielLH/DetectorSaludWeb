# Instrucciones de Configuración - Identificación de Plantas

## Configuración de la API Key

Para usar la funcionalidad de identificación de plantas, necesitas configurar tu API key de Plant.ID:

1. **Obtener API Key**: Regístrate en https://web.plant.id/ y obtén tu API key

2. **Crear archivo `.env`**: En la raíz del proyecto, crea un archivo `.env` con el siguiente contenido:
   ```
   PLANT_ID_API_KEY=tu_api_key_aqui
   ```

3. **Railway Deployment**: En Railway, agrega la variable de entorno:
   - Ve a tu proyecto en Railway
   - Navega a Variables → Add Variable
   - Nombre: `PLANT_ID_API_KEY`
   - Valor: tu API key

## Verificar la Instalación

El archivo `.gitignore` ya incluye `.env` en la línea 29, así que tu API key no se subirá a GitHub.

## Dependencias

Las siguientes dependencias se han agregado a `requirements.txt`:
- `requests==2.31.0` - Para hacer llamadas a la API
- `python-dotenv==1.0.0` - Para cargar variables de entorno

## Uso

1. Navega a la página "Identificación" en la aplicación web
2. Sube una imagen de una planta (arrastra o selecciona)
3. Haz clic en "Identificar Planta"
4. Los resultados mostrarán:
   - Nombre científico y nombres comunes
   - Descripción de Wikipedia
   - Nivel de confianza
   - Taxonomía completa
   - Imágenes similares
   - Sinónimos
