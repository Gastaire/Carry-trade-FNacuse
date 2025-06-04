// Carry Trade Calculator - Secure Implementation
(function() {
    'use strict';
    
    // Constants
    const EXPLANATIONS = {
        carryTrade: `
            El **Carry Trade** es una estrategia financiera que busca aprovechar la **diferencia de tasas de interés entre dos monedas**.
            <br><br>
            En el caso **Dólar/Pesos Argentinos**:
            <ol>
                <li><strong>Vendés dólares</strong> (moneda con tasa baja).</li>
                <li><strong>Convertís a pesos argentinos</strong> (moneda con tasa alta).</li>
                <li><strong>Invertís esos pesos</strong> para generar intereses.</li>
                <li><strong>Reconvertís a dólares</strong> al finalizar.</li>
            </ol>
            <br>
            El objetivo es que la ganancia por intereses en pesos supere la devaluación del peso frente al dólar. Es popular por su potencial de alta ganancia, pero **muy riesgoso** si el peso se devalúa más de lo esperado. Se conoce como "bicicleta financiera".
        `,
        calculatorPurpose: `
            La calculadora de Carry Trade te ayuda a ver si te conviene:
            <br><br>
            <ol>
                <li><strong>Cambiar dólares por pesos argentinos.</strong></li>
                <li><strong>Invertir ese dinero a una tasa de interés</strong> y luego, convertir de nuevo a la moneda original (dólares) para ver si obtuviste una ganancia, teniendo en cuenta cómo cambió el valor del dólar y la inflación en ese periodo de tiempo.</li>
            </ol>
            <br>
            Es una herramienta para estimar la rentabilidad de este tipo de operaciones financieras.
        `
    };

    // DOM elements
    const elements = {
        form: document.getElementById('carryTradeForm'),
        usdAmount: document.getElementById('usdAmount'),
        exchangeRateARS: document.getElementById('exchangeRateARS'),
        interestRate: document.getElementById('interestRate'),
        dailyRadio: document.getElementById('daily'),
        monthlyRadio: document.getElementById('monthly'),
        numDays: document.getElementById('numDays'),
        numMonths: document.getElementById('numMonths'),
        daysInputContainer: document.getElementById('daysInputContainer'),
        monthsInputContainer: document.getElementById('monthsInputContainer'),
        finalExchangeRateARS: document.getElementById('finalExchangeRateARS'),
        annualInflation: document.getElementById('annualInflation'),
        calculateBtn: document.getElementById('calculateBtn'),
        
        // Results
        finalUsdAmount: document.getElementById('finalUsdAmount'),
        profitLoss: document.getElementById('profitLoss'),
        finalUsdAmountAfterInflation: document.getElementById('finalUsdAmountAfterInflation'),
        profitLossAfterInflation: document.getElementById('profitLossAfterInflation'),
        finalUsdAmountPercentage: document.getElementById('finalUsdAmountPercentage'),
        finalUsdAmountAfterInflationPercentage: document.getElementById('finalUsdAmountAfterInflationPercentage'),
        
        // Modal
        modalOverlay: document.getElementById('explanationModalOverlay'),
        modalText: document.getElementById('modalText'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        
        // Info links
        carryTradeLink: document.getElementById('whatIsCarryTradeLink'),
        calculatorPurposeLink: document.getElementById('whatIsCalculatorForLink'),
        
        // Help icons
        helpIcons: document.querySelectorAll('.help-icon')
    };

    // Utility functions
    function sanitizeInput(value) {
        return parseFloat(value) || 0;
    }

    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    function formatPercentage(value) {
        return `(${value.toFixed(2)}%)`;
    }

    // Validation functions
    function validateInput(element, min = 0, max = Infinity) {
        const value = sanitizeInput(element.value);
        const errorElement = document.getElementById(`${element.id}-error`);
        
        if (isNaN(value) || value < min || value > max) {
            element.classList.add('border-red-500');
            errorElement.textContent = `Debe ser un número válido entre ${min} y ${max === Infinity ? '∞' : max}`;
            return false;
        }
        
        element.classList.remove('border-red-500');
        errorElement.textContent = '';
        return true;
    }

    function validateForm() {
        const validations = [
            validateInput(elements.usdAmount, 0.01, 999999999),
            validateInput(elements.exchangeRateARS, 0.01, 999999999),
            validateInput(elements.interestRate, 0, 1000),
            validateInput(elements.finalExchangeRateARS, 0.01, 999999999),
            validateInput(elements.annualInflation, 0, 1000)
        ];

        if (elements.dailyRadio.checked) {
            validations.push(validateInput(elements.numDays, 1, 36500));
        } else {
            validations.push(validateInput(elements.numMonths, 1, 1200));
        }

        return validations.every(isValid => isValid);
    }

    // UI functions
    function togglePeriodInputs() {
        if (elements.dailyRadio.checked) {
            elements.daysInputContainer.classList.remove('hidden-input');
            elements.monthsInputContainer.classList.add('hidden-input');
        } else {
            elements.daysInputContainer.classList.add('hidden-input');
            elements.monthsInputContainer.classList.remove('hidden-input');
        }
    }

    function updateResultDisplay(elementId, value, isPositive) {
        const element = elements[elementId];
        element.textContent = formatCurrency(value);
        element.classList.remove('positive', 'negative');
        element.classList.add(isPositive ? 'positive' : 'negative');
    }

    function updatePercentageDisplay(elementId, percentage) {
        const element = elements[elementId];
        element.textContent = formatPercentage(percentage);
        element.classList.remove('positive', 'negative');
        element.classList.add(percentage >= 0 ? 'positive' : 'negative');
    }

    function clearResults() {
        elements.finalUsdAmount.textContent = '$ 0.00';
        elements.profitLoss.textContent = '$ 0.00';
        elements.finalUsdAmountAfterInflation.textContent = '$ 0.00';
        elements.profitLossAfterInflation.textContent = '$ 0.00';
        elements.finalUsdAmountPercentage.textContent = '';
        elements.finalUsdAmountAfterInflationPercentage.textContent = '';
        
        // Remove color classes
        [elements.finalUsdAmount, elements.profitLoss, elements.finalUsdAmountAfterInflation, 
         elements.profitLossAfterInflation, elements.finalUsdAmountPercentage, 
         elements.finalUsdAmountAfterInflationPercentage].forEach(el => {
            el.classList.remove('positive', 'negative');
        });
    }

    // Modal functions
    function showModal(content) {
        elements.modalText.innerHTML = content;
        elements.modalOverlay.classList.add('active');
        elements.modalOverlay.setAttribute('aria-hidden', 'false');
        elements.modalCloseBtn.focus();
        
        // Trap focus in modal
        document.addEventListener('keydown', handleModalKeydown);
    }

    function hideModal() {
        elements.modalOverlay.classList.remove('active');
        elements.modalOverlay.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', handleModalKeydown);
    }

    function handleModalKeydown(e) {
        if (e.key === 'Escape') {
            hideModal();
        }
    }

    // Calculation functions
    function calculateCarryTrade() {
        if (!validateForm()) {
            clearResults();
            return;
        }

        try {
            const usdAmount = sanitizeInput(elements.usdAmount.value);
            const exchangeRateARS = sanitizeInput(elements.exchangeRateARS.value);
            const annualInterestRate = sanitizeInput(elements.interestRate.value) / 100;
            const finalExchangeRateARS = sanitizeInput(elements.finalExchangeRateARS.value);
            const annualInflationRate = sanitizeInput(elements.annualInflation.value) / 100;
            const isDailyInterest = elements.dailyRadio.checked;

            let periodValue = 0;
            if (isDailyInterest) {
                periodValue = sanitizeInput(elements.numDays.value);
            } else {
                periodValue = sanitizeInput(elements.numMonths.value);
            }

            // Calculate initial ARS amount
            const initialArsAmount = usdAmount * exchangeRateARS;

            // Calculate final ARS amount with interest
            let finalArsAmount = 0;
            if (isDailyInterest) {
                finalArsAmount = initialArsAmount * (1 + (annualInterestRate / 365) * periodValue);
            } else {
                finalArsAmount = initialArsAmount * (1 + (annualInterestRate / 12) * periodValue);
            }

            // Convert back to USD
            const finalUsdAmount = finalArsAmount / finalExchangeRateARS;
            const profitLoss = finalUsdAmount - usdAmount;

            // Calculate inflation adjustment
            let inflationFactor = 1;
            if (isDailyInterest) {
                inflationFactor = (1 + (annualInflationRate / 365) * periodValue);
            } else {
                inflationFactor = (1 + (annualInflationRate / 12) * periodValue);
            }

            const finalUsdAmountAfterInflation = finalUsdAmount / inflationFactor;
            const profitLossAfterInflation = finalUsdAmountAfterInflation - usdAmount;

            // Calculate percentages
            const percentageChange = ((finalUsdAmount - usdAmount) / usdAmount) * 100;
            const percentageChangeAfterInflation = ((finalUsdAmountAfterInflation - usdAmount) / usdAmount) * 100;

            // Update display
            updateResultDisplay('finalUsdAmount', finalUsdAmount, finalUsdAmount >= usdAmount);
            updateResultDisplay('profitLoss', profitLoss, profitLoss >= 0);
            updateResultDisplay('finalUsdAmountAfterInflation', finalUsdAmountAfterInflation, finalUsdAmountAfterInflation >= usdAmount);
            updateResultDisplay('profitLossAfterInflation', profitLossAfterInflation, profitLossAfterInflation >= 0);

            updatePercentageDisplay('finalUsdAmountPercentage', percentageChange);
            updatePercentageDisplay('finalUsdAmountAfterInflationPercentage', percentageChangeAfterInflation);

        } catch (error) {
            console.error('Error in calculation:', error);
            clearResults();
            elements.finalUsdAmount.textContent = 'Error en el cálculo';
            elements.finalUsdAmount.classList.add('negative');
        }
    }

    // Event listeners
    function setupEventListeners() {
        // Form submission
        elements.form.addEventListener('submit', function(e) {
            e.preventDefault();
            calculateCarryTrade();
        });

        // Period toggle
        elements.dailyRadio.addEventListener('change', togglePeriodInputs);
        elements.monthlyRadio.addEventListener('change', togglePeriodInputs);

        // Input validation on blur
        [elements.usdAmount, elements.exchangeRateARS, elements.interestRate, 
         elements.finalExchangeRateARS, elements.annualInflation, 
         elements.numDays, elements.numMonths].forEach(input => {
            input.addEventListener('blur', function() {
                validateInput(this, this === elements.numDays || this === elements.numMonths ? 1 : 0.01);
            });
        });

        // Real-time calculation on input change
        [elements.usdAmount, elements.exchangeRateARS, elements.interestRate, 
         elements.finalExchangeRateARS, elements.annualInflation, 
         elements.numDays, elements.numMonths].forEach(input => {
            input.addEventListener('input', debounce(calculateCarryTrade, 500));
        });

        // Modal events
        elements.carryTradeLink.addEventListener('click', function() {
            showModal(EXPLANATIONS.carryTrade);
        });

        elements.calculatorPurposeLink.addEventListener('click', function() {
            showModal(EXPLANATIONS.calculatorPurpose);
        });

        elements.helpIcons.forEach(icon => {
            icon.addEventListener('click', function() {
                const infoText = sanitizeHTML(this.dataset.info);
                showModal(infoText);
            });
        });

        elements.modalCloseBtn.addEventListener('click', hideModal);

        elements.modalOverlay.addEventListener('click', function(e) {
            if (e.target === elements.modalOverlay) {
                hideModal();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
                hideModal();
            }
        });
    }

    // Utility: Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Initialize application
    function init() {
        // Check if all required elements exist
        const missingElements = Object.entries(elements).filter(([key, element]) => {
            if (key === 'helpIcons') return false; // Skip NodeList
            return !element;
        });

        if (missingElements.length > 0) {
            console.error('Missing DOM elements:', missingElements.map(([key]) => key));
            return;
        }

        setupEventListeners();
        togglePeriodInputs();
        calculateCarryTrade(); // Initial calculation
        
        console.log('Carry Trade Calculator initialized successfully');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();