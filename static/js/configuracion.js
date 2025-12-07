document.addEventListener('DOMContentLoaded', function() {
    const formConfiguracion = document.getElementById('formConfiguracion');
    const inputModelo = document.getElementById('inputModelo');
    const inputMapeo = document.getElementById('inputMapeo');
    const nombreArchivo = document.getElementById('nombreArchivo');
    const nombreArchivoMapeo = document.getElementById('nombreArchivoMapeo');
    const resultadoConfig = document.getElementById('resultadoConfig');
    
    // Mostrar nombre de archivo de modelo seleccionado
    inputModelo.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            const file = this.files[0];
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            nombreArchivo.textContent = `Archivo seleccionado: ${file.name} (${sizeMB} MB)`;
            
            if (file.size > 500 * 1024 * 1024) {
                alert('Advertencia: El archivo es muy grande (>500MB). La carga puede fallar o tardar mucho tiempo.');
            }
        } else {
            nombreArchivo.textContent = '';
        }
    });
    
    // Mostrar nombre de archivo JSON seleccionado
    inputMapeo.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            const file = this.files[0];
            nombreArchivoMapeo.textContent = `Archivo seleccionado: ${file.name}`;
        } else {
            nombreArchivoMapeo.textContent = '';
        }
    });
    
    // Enviar formulario
    formConfiguracion.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        // Validar que se hayan seleccionado ambos archivos
        if (!inputModelo.files.length) {
            resultadoConfig.className = 'alert alert-error';
            resultadoConfig.innerHTML = `
                <span class="alert-icon">✗</span>
                <span>Por favor selecciona un archivo de modelo</span>
            `;
            resultadoConfig.style.display = 'flex';
            return;
        }
        
        if (!inputMapeo.files.length) {
            resultadoConfig.className = 'alert alert-error';
            resultadoConfig.innerHTML = `
                <span class="alert-icon">✗</span>
                <span>Por favor selecciona el archivo JSON de mapeo de clases</span>
            `;
            resultadoConfig.style.display = 'flex';
            return;
        }
        
        // Mostrar loading
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳</span> Cargando modelo y configuración...';
        
        resultadoConfig.style.display = 'none';
        
        try {
            console.log('Enviando modelo y mapeo...');
            
            const response = await fetch('/cargar_modelo', {
                method: 'POST',
                body: formData
            });
            
            console.log('Respuesta recibida:', response.status);
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Respuesta no es JSON. Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos:', data);
            
            if (data.success) {
                resultadoConfig.className = 'alert alert-success';
                resultadoConfig.innerHTML = `
                    <span class="alert-icon">✓</span>
                    <span>${data.mensaje}</span>
                `;
                resultadoConfig.style.display = 'flex';
                
                setTimeout(() => {
                    window.location.href = '/analisis';
                }, 2000);
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error completo:', error);
            
            let errorMessage = error.message;
            
            if (error.message.includes('413') || error.message.includes('too large')) {
                errorMessage = 'El archivo es demasiado grande. Tamaño máximo: 500MB';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = 'Error de conexión. Verifica que el servidor esté ejecutándose.';
            } else if (error.message.includes('Unexpected token')) {
                errorMessage = 'Error del servidor. Revisa la consola del servidor para más detalles.';
            }
            
            resultadoConfig.className = 'alert alert-error';
            resultadoConfig.innerHTML = `
                <span class="alert-icon">✗</span>
                <span>Error: ${errorMessage}</span>
            `;
            resultadoConfig.style.display = 'flex';
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
