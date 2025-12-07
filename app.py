from flask import Flask, render_template, request, jsonify, session
import tensorflow as tf
import numpy as np
import cv2
import base64
import io
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import secrets
import json

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max (para modelos grandes)
app.config['UPLOAD_FOLDER'] = 'static/uploads'

# Asegurar que exista la carpeta de uploads
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Variables globales
modelo = None
mapeo_clases = None
tipo_planta = "Planta"
nombres_clases = ['Saludable', 'Enferma', 'Muerta']
colores_clases = ['#4CAF50', '#FF9800', '#F44336']
ALTURA_IMG = 224
ANCHURA_IMG = 224
umbral_confianza_ood = 0.5

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/configuracion')
def configuracion():
    return render_template('configuracion.html')

@app.route('/analisis')
def analisis():
    if 'modelo_cargado' not in session:
        return render_template('configuracion.html', error="Debe cargar un modelo primero")
    return render_template('analisis.html', 
                         tipo_planta=session.get('tipo_planta', 'Planta'),
                         nombres_clases=session.get('nombres_clases', nombres_clases),
                         colores_clases=colores_clases)

@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(e):
    return jsonify({
        'success': False, 
        'error': 'El archivo es demasiado grande. Tamaño máximo: 500MB'
    }), 413

@app.route('/cargar_modelo', methods=['POST'])
def cargar_modelo():
    global modelo, tipo_planta, mapeo_clases, nombres_clases
    
    try:
        if 'modelo' not in request.files:
            return jsonify({'success': False, 'error': 'No se seleccionó ningún archivo de modelo'})
        
        if 'mapeo' not in request.files:
            return jsonify({'success': False, 'error': 'No se seleccionó el archivo JSON de mapeo'})
        
        archivo_modelo = request.files['modelo']
        archivo_mapeo = request.files['mapeo']
        tipo_planta_input = request.form.get('tipo_planta', 'Planta')
        
        if archivo_modelo.filename == '' or archivo_mapeo.filename == '':
            return jsonify({'success': False, 'error': 'No se seleccionaron ambos archivos'})
        
        # Validar extensión del modelo
        extension_modelo = archivo_modelo.filename.rsplit('.', 1)[1].lower() if '.' in archivo_modelo.filename else ''
        if extension_modelo not in ['h5', 'keras']:
            return jsonify({
                'success': False, 
                'error': 'Formato de modelo no válido. Use .h5 o .keras'
            })
        
        # Validar extensión del JSON
        extension_json = archivo_mapeo.filename.rsplit('.', 1)[1].lower() if '.' in archivo_mapeo.filename else ''
        if extension_json != 'json':
            return jsonify({
                'success': False, 
                'error': 'El archivo de mapeo debe ser .json'
            })
        
        # Cargar y validar JSON
        try:
            mapeo_data = json.load(archivo_mapeo.stream)
            
            # Validar estructura del JSON
            if 'mapeo_clases' not in mapeo_data:
                return jsonify({'success': False, 'error': 'El JSON debe contener "mapeo_clases"'})
            if 'nombres_display' not in mapeo_data:
                return jsonify({'success': False, 'error': 'El JSON debe contener "nombres_display"'})
            if 'tipo_planta' not in mapeo_data:
                return jsonify({'success': False, 'error': 'El JSON debe contener "tipo_planta"'})
            
            mapeo_clases = mapeo_data
            nombres_clases = mapeo_data['nombres_display']
            tipo_planta = mapeo_data['tipo_planta']
            
            print(f"Mapeo de clases cargado: {mapeo_clases}")
            print(f"Nombres de clases: {nombres_clases}")
            
        except json.JSONDecodeError:
            return jsonify({'success': False, 'error': 'El archivo JSON no es válido'})
        
        # Guardar y cargar el modelo
        filename = secure_filename(archivo_modelo.filename)
        ruta_temporal = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        print(f"Guardando modelo en: {ruta_temporal}")
        archivo_modelo.save(ruta_temporal)
        print(f"Modelo guardado. Tamaño: {os.path.getsize(ruta_temporal)} bytes")
        
        print("Cargando modelo en TensorFlow...")
        modelo = tf.keras.models.load_model(ruta_temporal, compile=False)
        print("Modelo cargado exitosamente")
        
        # Guardar en sesión
        session['modelo_cargado'] = True
        session['tipo_planta'] = tipo_planta
        session['nombre_modelo'] = filename
        session['nombres_clases'] = nombres_clases
        
        # Verificar número de clases
        output_shape = modelo.output_shape
        num_clases = output_shape[-1] if isinstance(output_shape, tuple) else 3
        
        print(f"Número de clases del modelo: {num_clases}")
        
        if num_clases != len(nombres_clases):
            return jsonify({
                'success': False, 
                'error': f'El modelo tiene {num_clases} clases pero el JSON define {len(nombres_clases)}'
            })
        
        return jsonify({
            'success': True, 
            'mensaje': f'Modelo y configuración cargados: {tipo_planta}',
            'tipo_planta': tipo_planta,
            'clases': nombres_clases
        })
        
    except RequestEntityTooLarge:
        return jsonify({
            'success': False, 
            'error': 'El archivo es demasiado grande. Tamaño máximo: 500MB'
        }), 413
    except Exception as e:
        print(f"Error al cargar modelo: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error al cargar modelo: {str(e)}'})

@app.route('/analizar_imagen', methods=['POST'])
def analizar_imagen():
    if modelo is None or mapeo_clases is None:
        return jsonify({'success': False, 'error': 'No hay modelo o configuración cargada'})
    
    if 'imagen' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió ninguna imagen'})
    
    archivo = request.files['imagen']
    
    try:
        # Leer imagen
        imagen_pil = Image.open(archivo.stream).convert('RGB')
        imagen_cv = np.array(imagen_pil)
        
        # Guardar imagen original para visualización
        filename = secure_filename(archivo.filename)
        
        # Crear carpeta uploads si no existe (con ruta absoluta)
        upload_folder = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Guardar con ruta absoluta
        ruta_imagen = os.path.join(upload_folder, filename)
        imagen_pil.save(ruta_imagen)
        
        # Verificar que el archivo se guardó
        if not os.path.exists(ruta_imagen):
            print(f"Error: No se pudo guardar la imagen en {ruta_imagen}")
            return jsonify({'success': False, 'error': 'Error al guardar imagen'})
        else:
            print(f"Imagen guardada correctamente en: {ruta_imagen}")
        
        # Análisis OOD
        resultado_ood = detectar_fuera_distribucion(imagen_cv)
        
        # Preprocesar para el modelo
        imagen_modelo = cv2.resize(imagen_cv, (ALTURA_IMG, ANCHURA_IMG))
        imagen_modelo = imagen_modelo / 255.0
        imagen_modelo = np.expand_dims(imagen_modelo, axis=0)
        
        # Predicción
        predicciones = modelo.predict(imagen_modelo, verbose=0)[0]
        
        # Aplicar mapeo si existe mapeo_generador_a_original
        if 'mapeo_generador_a_original' in mapeo_clases:
            mapeo_gen = mapeo_clases['mapeo_generador_a_original']
            predicciones_mapeadas = np.zeros_like(predicciones)
            for idx_gen, idx_orig in mapeo_gen.items():
                predicciones_mapeadas[int(idx_orig)] = predicciones[int(idx_gen)]
            predicciones = predicciones_mapeadas
        
        clase_predicha = int(np.argmax(predicciones))
        
        # Análisis de color
        analisis_color = analizar_color(imagen_cv)
        
        # Generar visualizaciones
        graficos = generar_graficos(imagen_cv, predicciones, analisis_color)
        
        # IMPORTANTE: Usar barras normales para URL (no barras invertidas de Windows)
        imagen_url = f'/static/uploads/{filename}'
        print(f"URL generada: {imagen_url}")
        
        return jsonify({
            'success': True,
            'clase': nombres_clases[clase_predicha],
            'confianza': float(predicciones[clase_predicha]),
            'predicciones': [float(p) for p in predicciones],
            'ood': resultado_ood,
            'analisis_color': analisis_color,
            'graficos': graficos,
            'imagen_url': imagen_url
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error al analizar imagen: {str(e)}'})

def detectar_fuera_distribucion(imagen):
    img_array = cv2.resize(imagen, (ALTURA_IMG, ANCHURA_IMG))
    img_tensor = np.expand_dims(img_array, axis=0)
    img_tensor = img_tensor / 255.0
    
    prediccion = modelo.predict(img_tensor, verbose=0)[0]
    clase_pred = int(np.argmax(prediccion))
    confianza = float(prediccion[clase_pred])
    entropia = float(-np.sum(prediccion * np.log2(prediccion + 1e-10)))
    es_ood = confianza < umbral_confianza_ood or entropia > 1.0
    
    return {
        'clase': clase_pred,
        'confianza': confianza,
        'entropia': entropia,
        'es_ood': es_ood
    }

def analizar_color(imagen):
    hsv = cv2.cvtColor(imagen, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv)
    
    mascara_verde = cv2.inRange(h, 40, 80)
    mascara_amarillo = cv2.inRange(h, 20, 40)
    
    porcentaje_verde = float(np.sum(mascara_verde > 0) / mascara_verde.size * 100)
    porcentaje_amarillo = float(np.sum(mascara_amarillo > 0) / mascara_amarillo.size * 100)
    
    return {
        'porcentaje_verde': porcentaje_verde,
        'porcentaje_amarillo': porcentaje_amarillo
    }

def generar_graficos(imagen, predicciones, analisis_color):
    graficos = {}
    
    # Histograma RGB
    fig, ax = plt.subplots(figsize=(8, 4))
    for i, color in enumerate(['r', 'g', 'b']):
        hist = cv2.calcHist([imagen], [i], None, [256], [0, 256])
        ax.plot(hist, color=color)
    ax.set_xlim([0, 256])
    ax.set_title('Histograma RGB')
    ax.grid(alpha=0.3)
    graficos['histograma_rgb'] = fig_to_base64(fig)
    plt.close(fig)
    
    # Distribución de predicciones
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(nombres_clases, predicciones, color=colores_clases)
    ax.set_ylabel('Confianza')
    ax.set_title('Distribución de Predicciones')
    ax.set_ylim([0, 1])
    graficos['predicciones'] = fig_to_base64(fig)
    plt.close(fig)
    
    # Análisis HSV
    hsv = cv2.cvtColor(imagen, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv)
    
    fig, axes = plt.subplots(2, 2, figsize=(10, 8))
    
    axes[0, 0].imshow(h, cmap='hsv')
    axes[0, 0].set_title('Canal H (Tono)')
    axes[0, 0].axis('off')
    
    axes[0, 1].imshow(s, cmap='plasma')
    axes[0, 1].set_title('Canal S (Saturación)')
    axes[0, 1].axis('off')
    
    axes[1, 0].imshow(v, cmap='gray')
    axes[1, 0].set_title('Canal V (Brillo)')
    axes[1, 0].axis('off')
    
    mascara_verde = cv2.inRange(h, 40, 80)
    axes[1, 1].imshow(mascara_verde, cmap='Greens')
    axes[1, 1].set_title('Detección de Verde')
    axes[1, 1].axis('off')
    
    plt.tight_layout()
    graficos['analisis_hsv'] = fig_to_base64(fig)
    plt.close(fig)
    
    return graficos

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    return img_base64

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
