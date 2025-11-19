
const form = document.getElementById('covidForm');
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
            setTimeout(() => {
                loading.classList.remove('active');
                form.querySelector('.submit-btn').disabled = false;
                
                // Show result modal
                showResult(data);
            }, 2000);
        });

        function showResult(data) {
            const modal = document.getElementById('resultModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const riskBadge = document.getElementById('riskBadge');
            
            // Calculate risk based on responses
            let riskScore = 0;
            const yesResponses = Object.values(data).filter(val => val === 'yes').length;
            
            // Determine risk level
            let riskLevel, riskClass, icon, title, message;
            
            if (yesResponses <= 2) {
                riskLevel = 'Low Risk';
                riskClass = 'risk-low';
                icon = '✅';
                title = 'Low COVID-19 Risk';
                message = 'Based on your responses, you have a low risk of COVID-19. Continue following safety guidelines and maintaining good hygiene practices.';
            } else if (yesResponses <= 5) {
                riskLevel = 'Moderate Risk';
                riskClass = 'risk-moderate';
                icon = '⚠️';
                title = 'Moderate COVID-19 Risk';
                message = 'Your assessment indicates moderate risk. We recommend getting tested if you develop symptoms, avoiding crowded places, and consulting with a healthcare professional.';
            } else {
                riskLevel = 'High Risk';
                riskClass = 'risk-high';
                icon = '🚨';
                title = 'High COVID-19 Risk';
                message = 'Your assessment indicates high risk. We strongly recommend getting tested immediately, self-isolating, and contacting a healthcare provider for guidance. Monitor your symptoms closely.';
            }
            
            modalIcon.textContent = icon;
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            riskBadge.textContent = riskLevel;
            riskBadge.className = 'risk-badge ' + riskClass;
            const entry = {
                type: 'covid',
                timestamp: new Date().toISOString(),
                inputs: data,
                result: {
                    riskLevel,
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
            
            // You could redirect to a detailed recommendations page here
            console.log('Redirecting to recommendations...');
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
