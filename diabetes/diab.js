
const form = document.getElementById('diabetesForm');
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
            // This is where you would process the actual prediction result
            // For now, we'll show a placeholder result
            
            const modal = document.getElementById('resultModal');
            const modalIcon = document.getElementById('modalIcon');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            
            // Simulate a result (replace with actual model prediction)
            const riskLevel = Math.random() > 0.5 ? 'low' : 'moderate';
            
            if (riskLevel === 'low') {
                modalIcon.textContent = '✅';
                modalTitle.textContent = 'Low Risk Detected';
                modalMessage.textContent = 'Based on your health profile, you have a low risk of diabetes. Continue maintaining a healthy lifestyle!';
            } else {
                modalIcon.textContent = '⚠️';
                modalTitle.textContent = 'Moderate Risk Detected';
                modalMessage.textContent = 'Your health profile indicates moderate diabetes risk. We recommend consulting with a healthcare professional and adopting healthier lifestyle choices.';
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

        // Form validation with visual feedback
        const inputs = document.querySelectorAll('input, select');
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