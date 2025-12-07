// identificacion.js - Plant Identification Page

document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const uploadArea = document.getElementById('uploadArea');
    const imagenInput = document.getElementById('imagenInput');
    const selectBtn = document.getElementById('selectBtn');
    const previewSection = document.getElementById('previewSection');
    const imagePreview = document.getElementById('imagePreview');
    const changeImageBtn = document.getElementById('changeImageBtn');
    const identifyBtn = document.getElementById('identifyBtn');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    const newSearchBtn = document.getElementById('newSearchBtn');

    let selectedFile = null;

    // Click to select image
    selectBtn.addEventListener('click', () => {
        imagenInput.click();
    });

    uploadArea.addEventListener('click', (e) => {
        if (e.target === uploadArea || e.target.closest('.upload-content')) {
            imagenInput.click();
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input change
    imagenInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Handle file selection
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showError('Por favor selecciona un archivo de imagen válido');
            return;
        }

        selectedFile = file;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadArea.style.display = 'none';
            previewSection.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    // Change image
    changeImageBtn.addEventListener('click', () => {
        resetToUpload();
    });

    // Identify plant
    identifyBtn.addEventListener('click', () => {
        if (!selectedFile) {
            showError('No se ha seleccionado ninguna imagen');
            return;
        }
        identifyPlant();
    });

    // Retry button
    retryBtn.addEventListener('click', () => {
        hideError();
        previewSection.style.display = 'flex';
    });

    // New search button
    newSearchBtn.addEventListener('click', () => {
        resetToUpload();
    });

    // Identify plant function
    async function identifyPlant() {
        const formData = new FormData();
        formData.append('imagen', selectedFile);

        // Show loading
        previewSection.style.display = 'none';
        loadingSection.style.display = 'flex';
        hideError();
        resultsSection.style.display = 'none';

        try {
            const response = await fetch('/identificar_planta', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            loadingSection.style.display = 'none';

            if (data.success) {
                displayResults(data);
            } else {
                showError(data.error || 'Error al identificar la planta');
            }
        } catch (error) {
            loadingSection.style.display = 'none';
            showError('Error de conexión. Por favor intenta de nuevo.');
            console.error('Error:', error);
        }
    }

    // Display results
    function displayResults(data) {
        // Scientific name
        document.getElementById('scientificName').textContent = data.scientific_name;

        // Common names
        const commonNamesDiv = document.getElementById('commonNames');
        if (data.common_names && data.common_names.length > 0) {
            commonNamesDiv.innerHTML = data.common_names
                .map(name => `<span class="badge">${name}</span>`)
                .join('');
        } else {
            commonNamesDiv.innerHTML = '<span class="badge">No disponible</span>';
        }

        // Confidence
        const confidenceFill = document.getElementById('confidenceFill');
        const confidenceText = document.getElementById('confidenceText');
        confidenceFill.style.width = `${data.probability}%`;
        confidenceText.textContent = `${data.probability}%`;

        // Color code confidence
        if (data.probability >= 80) {
            confidenceFill.style.backgroundColor = '#4CAF50';
        } else if (data.probability >= 50) {
            confidenceFill.style.backgroundColor = '#FF9800';
        } else {
            confidenceFill.style.backgroundColor = '#F44336';
        }

        // Description
        document.getElementById('description').textContent = data.description;

        // Wikipedia link
        const wikiLink = document.getElementById('wikiLink');
        if (data.url) {
            wikiLink.href = data.url;
            wikiLink.style.display = 'inline-block';
        } else {
            wikiLink.style.display = 'none';
        }

        // Taxonomy
        const taxonomyList = document.getElementById('taxonomyList');
        if (data.taxonomy && Object.keys(data.taxonomy).length > 0) {
            taxonomyList.innerHTML = Object.entries(data.taxonomy)
                .map(([key, value]) => `
                    <div class="taxonomy-item">
                        <strong>${capitalizeFirst(key)}:</strong>
                        <span>${value}</span>
                    </div>
                `)
                .join('');
        } else {
            taxonomyList.innerHTML = '<p>No disponible</p>';
        }

        // Similar images
        const similarImagesDiv = document.getElementById('similarImages');
        if (data.similar_images && data.similar_images.length > 0) {
            similarImagesDiv.innerHTML = data.similar_images
                .map(img => `
                    <div class="similar-image">
                        <img src="${img.url_small || img.url}" 
                             alt="Imagen similar" 
                             loading="lazy">
                        <div class="similarity">${Math.round(img.similarity * 100)}%</div>
                    </div>
                `)
                .join('');
        } else {
            similarImagesDiv.innerHTML = '<p>No hay imágenes similares disponibles</p>';
        }

        // Synonyms
        const synonymsList = document.getElementById('synonymsList');
        if (data.synonyms && data.synonyms.length > 0) {
            synonymsList.innerHTML = data.synonyms
                .map(syn => `<span class="badge">${syn}</span>`)
                .join('');
        } else {
            synonymsList.innerHTML = '<span class="badge">No hay sinónimos disponibles</span>';
        }

        // Show results
        resultsSection.style.display = 'block';
    }

    // Show error
    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'flex';
        previewSection.style.display = 'none';
    }

    // Hide error
    function hideError() {
        errorSection.style.display = 'none';
    }

    // Reset to upload
    function resetToUpload() {
        selectedFile = null;
        imagenInput.value = '';
        uploadArea.style.display = 'flex';
        previewSection.style.display = 'none';
        resultsSection.style.display = 'none';
        hideError();
    }

    // Helper function
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});
