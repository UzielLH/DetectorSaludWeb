# 🌱 Detector de Salud de Plantas

Aplicación web para detectar el estado de salud de plantas usando Deep Learning.

## 🚀 Características

- Carga de modelos personalizados (.h5, .keras)
- Configuración mediante archivos JSON
- Análisis en tiempo real de imágenes
- Interfaz intuitiva y responsiva

## 📋 Requisitos

```txt
Flask==3.0.0
tensorflow==2.15.0
numpy==1.24.3
Pillow==10.1.0
gunicorn==21.2.0
```

## 🛠️ Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/UzielLH/DetectorSaludWeb.git
cd DetectorSaludWeb

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar aplicación
python app.py
```

## 🌐 Despliegue

Ver [DEPLOY.md](DEPLOY.md) para instrucciones de despliegue en Render, Railway, etc.

## 📁 Estructura del Proyecto

