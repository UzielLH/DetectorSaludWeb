document.addEventListener('DOMContentLoaded', function() {
    const inputImagen = document.getElementById('inputImagen');
    const resultadosAnalisis = document.getElementById('resultadosAnalisis');
    const loading = document.getElementById('loading');
    
    // Manejo de tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remover clase active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al seleccionado
            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });
    
    // Cargar imagen
    inputImagen.addEventListener('change', async function(e) {
        if (this.files.length === 0) return;
        
        const archivo = this.files[0];
        
        // Validar tipo de archivo
        if (!archivo.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }
        
        // Mostrar loading
        loading.style.display = 'flex';
        
        // Crear FormData
        const formData = new FormData();
        formData.append('imagen', archivo);
        
        try {
            const response = await fetch('/analizar_imagen', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                mostrarResultados(data);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            alert(`Error al analizar imagen: ${error.message}`);
        } finally {
            loading.style.display = 'none';
        }
    });
    
    function mostrarResultados(data) {
        // Mostrar contenedor de resultados
        resultadosAnalisis.style.display = 'block';
        
        // Mostrar imagen cargada
        document.getElementById('imagenCargada').src = data.imagen_url;
        
        // Resultado principal
        const resultadoPrincipal = document.getElementById('resultadoPrincipal');
        const colorClase = coloresClases[nombresClases.indexOf(data.clase)];
        
        let advertenciaOOD = '';
        if (data.ood.es_ood) {
            advertenciaOOD = `
                <div class="alert alert-warning" style="margin-top: 1rem;">
                    <span class="alert-icon">⚠️</span>
                    <span>ADVERTENCIA: Esta imagen puede no ser reconocible como ${tipoPlanta}</span>
                </div>
            `;
        }
        
        resultadoPrincipal.innerHTML = `
            <div style="background-color: ${colorClase}22; padding: 1.5rem; border-radius: 8px; border: 2px solid ${colorClase};">
                <h2 style="color: ${colorClase}; margin-bottom: 0.5rem;">${data.clase}</h2>
                <p style="font-size: 1.2rem;">Confianza: ${formatearPorcentaje(data.confianza)}</p>
            </div>
            ${advertenciaOOD}
        `;
        
        // Métricas OOD
        const metricasOOD = document.getElementById('metricasOOD');
        const confianzaColor = data.ood.confianza >= 0.5 ? '#4CAF50' : '#F44336';
        const entropiaColor = data.ood.entropia <= 1.0 ? '#4CAF50' : '#F44336';
        
        metricasOOD.innerHTML = `
            <div class="metrica-ood">
                <div class="metrica-ood-label">Confianza del Modelo</div>
                <div class="metrica-ood-valor" style="color: ${confianzaColor};">
                    ${formatearPorcentaje(data.ood.confianza)}
                </div>
            </div>
            <div class="metrica-ood">
                <div class="metrica-ood-label">Entropía (Incertidumbre)</div>
                <div class="metrica-ood-valor" style="color: ${entropiaColor};">
                    ${data.ood.entropia.toFixed(3)}
                </div>
            </div>
            <div class="metrica-ood">
                <div class="metrica-ood-label">Estado de Validación</div>
                <div class="metrica-ood-valor" style="color: ${data.ood.es_ood ? '#FF9800' : '#4CAF50'};">
                    ${data.ood.es_ood ? '⚠️ OOD' : '✓ Válida'}
                </div>
            </div>
        `;
        
        // Barras de predicciones
        const barrasPredicciones = document.getElementById('barrasPredicciones');
        barrasPredicciones.innerHTML = '';
        
        data.predicciones.forEach((prediccion, index) => {
            const porcentaje = prediccion * 100;
            const color = coloresClases[index];
            
            const barraHTML = `
                <div class="barra-container">
                    <div class="barra-header">
                        <span class="barra-label">${nombresClases[index]}</span>
                        <span class="barra-porcentaje">${porcentaje.toFixed(2)}%</span>
                    </div>
                    <div class="barra-progreso">
                        <div class="barra-fill" style="width: ${porcentaje}%; background-color: ${color};"></div>
                    </div>
                </div>
            `;
            
            barrasPredicciones.innerHTML += barraHTML;
        });
        
        // Gráficos en análisis detallado
        document.getElementById('graficoHistogramaRGB').src = 'data:image/png;base64,' + data.graficos.histograma_rgb;
        document.getElementById('graficoPredicciones').src = 'data:image/png;base64,' + data.graficos.predicciones;
        
        // Gráfico HSV en visualización avanzada
        document.getElementById('graficoHSV').src = 'data:image/png;base64,' + data.graficos.analisis_hsv;
        
        // Métricas detalladas
        const textoMetricas = document.getElementById('textoMetricas');
        
        let recomendacion = generarRecomendacion(data.analisis_color, data.clase);
        
        textoMetricas.textContent = `
ANÁLISIS DETALLADO DE ${tipoPlanta.toUpperCase()}:

Validación de Imagen:
- Confianza del modelo: ${formatearPorcentaje(data.ood.confianza)}
- Entropía (incertidumbre): ${data.ood.entropia.toFixed(3)}
- Estado: ${data.ood.es_ood ? '⚠️ FUERA DE DISTRIBUCIÓN' : '✓ Imagen válida'}

Métricas de Color:
- Porcentaje de área verde (saludable): ${data.analisis_color.porcentaje_verde.toFixed(2)}%
- Porcentaje de área amarilla/marrón (estresada): ${data.analisis_color.porcentaje_amarillo.toFixed(2)}%
- Relación verde/amarillo: ${(data.analisis_color.porcentaje_verde / Math.max(data.analisis_color.porcentaje_amarillo, 0.1)).toFixed(2)}

Clasificación del Modelo:
- Clase predicha: ${data.clase}
- Confianza: ${formatearPorcentaje(data.confianza)}

RECOMENDACIÓN:
${recomendacion}

${data.ood.es_ood ? '⚠️ ADVERTENCIA: Esta imagen puede no ser confiable. Revise manualmente.' : ''}
        `;
        
        // Scroll suave hacia resultados
        resultadosAnalisis.scrollIntoView({ behavior: 'smooth' });
    }
    
    function generarRecomendacion(analisisColor, clase) {
        const porcentajeVerde = analisisColor.porcentaje_verde;
        const porcentajeAmarillo = analisisColor.porcentaje_amarillo;
        
        if (porcentajeVerde > 80) {
            return `El ${tipoPlanta.toLowerCase()} muestra buenos niveles de verdor y parece estar en estado saludable. Continúe con el régimen de cuidado actual.`;
        } else if (porcentajeAmarillo > 30) {
            return `El ${tipoPlanta.toLowerCase()} muestra signos de estrés con áreas amarillas significativas. Revise el riego, la exposición a la luz y posibles plagas.`;
        } else if (porcentajeVerde < 50 && porcentajeAmarillo < 20) {
            return `El ${tipoPlanta.toLowerCase()} muestra resultados mixtos. Puede estar en transición o necesitar ajustes en el cuidado. Monitoree de cerca.`;
        } else {
            return `El ${tipoPlanta.toLowerCase()} muestra resultados dentro del rango normal. Continúe con el régimen de cuidado habitual y monitoree cambios.`;
        }
    }
});
