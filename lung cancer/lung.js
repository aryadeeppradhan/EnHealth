
const form = document.getElementById('lungCancerForm');
        const loading = document.getElementById('loading');
        const modal = document.getElementById('resultModal');

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Show loading
            loading.classList.add('active');
            form.querySelector('.submit-btn').disabled = true;
            
            // Simulate API call (replace with actual backend call)
            // When integrating with your ML model, replace this setTimeout with:
            /*
            fetch('/api/predict-lung-cancer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                loading.classList.remove('active');
                form.querySelector('.submit-btn').disabled = false;
                showResult(result);
            })
            .catch(error => {
                console.error('Error:', error);
                loading.classList.remove('active');
                form.querySelector('.submit-btn').disabled = false;
                alert('An error occurred. Please try again.');
            });
            */
            
            setTimeout(() => {
                loading.classList.remove('active');
                form.querySelector('.submit-btn').disabled = false;
                
                // Simulate result (replace with actual model prediction)
                const simulatedResult = {
                    riskPercentage: Math.floor(Math.random() * 100),
                    prediction: Math.random() > 0.5 ? 'low' : 'high'
                };
                
                showResult(simulatedResult, data);
            }, 2500);
        });

        function showResult(result, inputs) {
            const modal = document.getElementById('resultModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const riskPercentage = document.getElementById('riskPercentage');
            
            // Display the risk percentage
            riskPercentage.textContent = result.riskPercentage + '%';
            
            // Determine risk level and customize modal content
            let icon, title, message, riskLevel;
            
            if (result.riskPercentage < 30 || result.prediction === 'low') {
                icon = '✅';
                title = 'Low Risk Detected';
                message = 'Based on your health profile, you have a low risk of lung cancer. Continue maintaining a healthy lifestyle and regular check-ups with your healthcare provider.';
                riskLevel = 'low';
                riskPercentage.style.borderColor = '#4ade80';
                riskPercentage.style.color = '#4ade80';
                riskPercentage.style.background = 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2))';
            } else if (result.riskPercentage < 70) {
                icon = '⚠️';
                title = 'Moderate Risk Detected';
                message = 'Your assessment indicates moderate risk. We recommend scheduling a consultation with a pulmonologist, maintaining a healthy lifestyle, and considering regular screening tests.';
                riskLevel = 'moderate';
                riskPercentage.style.borderColor = '#fbbf24';
                riskPercentage.style.color = '#fbbf24';
                riskPercentage.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2))';
            } else {
                icon = '🚨';
                title = 'High Risk Detected';
                message = 'Your assessment indicates high risk. We strongly recommend immediate consultation with a healthcare professional for comprehensive evaluation and screening. Early detection is crucial.';
                riskLevel = 'high';
                riskPercentage.style.borderColor = '#ef4444';
                riskPercentage.style.color = '#ef4444';
                riskPercentage.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))';
            }
            
            modalIcon.textContent = icon;
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            const entry = {
                type: 'lung',
                timestamp: new Date().toISOString(),
                inputs,
                result: {
                    riskLevel,
                    percentage: result.riskPercentage,
                    title: modalTitle.textContent,
                    message: modalMessage.textContent
                }
            };
            if (window.EnHealthAuth?.isLoggedIn()) {
                EnHealthAuth.saveHistory(entry);
            }
            modal.classList.add('active');
        }

        function closeModal() {
            const modal = document.getElementById('resultModal');
            modal.classList.remove('active');
            
            // You could redirect to a detailed report page here
            console.log('Redirecting to detailed report...');
        }

        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Add visual feedback for radio button selections
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function() {
                // Add a subtle animation to show selection
                const label = this.nextElementSibling;
                label.style.animation = 'none';
                setTimeout(() => {
                    label.style.animation = '';
                }, 10);
            });
        });

        // Form validation with visual feedback
        const ageInput = document.getElementById('age');
        ageInput.addEventListener('blur', function() {
            if (this.value && this.checkValidity()) {
                this.style.borderColor = 'rgba(74, 222, 128, 0.6)';
            } else if (this.value && !this.checkValidity()) {
                this.style.borderColor = 'rgba(239, 68, 68, 0.6)';
            }
        });

        ageInput.addEventListener('focus', function() {
            this.style.borderColor = 'rgba(127, 216, 190, 0.2)';
        });
