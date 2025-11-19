
const form = document.getElementById('sleepForm');
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
            fetch('/api/predict-sleep-disorder', {
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
                const disorders = ['None', 'Insomnia', 'Sleep Apnea'];
                const randomDisorder = disorders[Math.floor(Math.random() * disorders.length)];
                
                const simulatedResult = {
                    disorder: randomDisorder,
                    confidence: (Math.random() * 30 + 70).toFixed(1) // 70-100%
                };
                
                showResult(simulatedResult);
            }, 2500);
        });

        function showResult(result) {
            const modal = document.getElementById('resultModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const disorderBadge = document.getElementById('disorderBadge');
            
            let icon, title, message, badgeStyle;
            
            if (result.disorder === 'None') {
                icon = '✅';
                title = 'Healthy Sleep Pattern';
                message = `Great news! Your sleep analysis shows no indicators of sleep disorders (${result.confidence}% confidence). Continue maintaining your healthy sleep habits and lifestyle.`;
                disorderBadge.textContent = 'No Disorder Detected';
                badgeStyle = 'background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2)); border: 2px solid #4ade80; color: #4ade80;';
            } else if (result.disorder === 'Insomnia') {
                icon = '😔';
                title = 'Insomnia Detected';
                message = `Our analysis indicates signs of insomnia (${result.confidence}% confidence). We recommend consulting a sleep specialist, establishing a consistent sleep schedule, and practicing good sleep hygiene.`;
                disorderBadge.textContent = 'Insomnia';
                badgeStyle = 'background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.2)); border: 2px solid #fbbf24; color: #fbbf24;';
            } else if (result.disorder === 'Sleep Apnea') {
                icon = '😴';
                title = 'Sleep Apnea Detected';
                message = `Your assessment suggests possible sleep apnea (${result.confidence}% confidence). This condition requires medical attention. Please consult a sleep specialist for proper diagnosis and treatment options.`;
                disorderBadge.textContent = 'Sleep Apnea';
                badgeStyle = 'background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2)); border: 2px solid #ef4444; color: #ef4444;';
            }
            
            modalIcon.textContent = icon;
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            disorderBadge.setAttribute('style', badgeStyle);
            
            modal.classList.add('active');
        }

        function closeModal() {
            const modal = document.getElementById('resultModal');
            modal.classList.remove('active');
            
            // You could redirect to a detailed recommendations page here
            console.log('Redirecting to recommendations...');
        }

        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Form validation with visual feedback
        const inputs = document.querySelectorAll('input[type="number"], select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.value && this.checkValidity()) {
                    this.style.borderColor = 'rgba(74, 222, 128, 0.6)';
                } else if (this.value && !this.checkValidity()) {
                    this.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                }
            });

            input.addEventListener('focus', function() {
                this.style.borderColor = 'rgba(127, 216, 190, 0.2)';
            });
        });

        // Add visual feedback for radio button selections
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const label = this.nextElementSibling;
                label.style.animation = 'none';
                setTimeout(() => {
                    label.style.animation = '';
                }, 10);
            });
        });

        // Real-time validation hints
        const sleepQuality = document.getElementById('sleepQuality');
        const stressLevel = document.getElementById('stressLevel');
        const physicalActivity = document.getElementById('physicalActivity');

        sleepQuality.addEventListener('input', function() {
            if (this.value < 1 || this.value > 10) {
                this.setCustomValidity('Sleep quality must be between 1 and 10');
            } else {
                this.setCustomValidity('');
            }
        });

        stressLevel.addEventListener('input', function() {
            if (this.value < 1 || this.value > 8) {
                this.setCustomValidity('Stress level must be between 1 and 8');
            } else {
                this.setCustomValidity('');
            }
        });

        physicalActivity.addEventListener('input', function() {
            if (this.value < 10 || this.value > 100) {
                this.setCustomValidity('Physical activity level must be between 10 and 100');
            } else {
                this.setCustomValidity('');
            }
        });

        // Blood pressure validation
        const systolicBP = document.getElementById('systolicBP');
        const diastolicBP = document.getElementById('diastolicBP');

        function validateBloodPressure() {
            const systolic = parseInt(systolicBP.value);
            const diastolic = parseInt(diastolicBP.value);
            
            if (systolic && diastolic && systolic <= diastolic) {
                systolicBP.setCustomValidity('Systolic BP should be higher than Diastolic BP');
                diastolicBP.setCustomValidity('Diastolic BP should be lower than Systolic BP');
            } else {
                systolicBP.setCustomValidity('');
                diastolicBP.setCustomValidity('');
            }
        }

        systolicBP.addEventListener('input', validateBloodPressure);
        diastolicBP.addEventListener('input', validateBloodPressure);
