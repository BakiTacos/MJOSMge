// Business Settings Navigation
document.getElementById('businessSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsSection').style.display = 'none';
    document.getElementById('businessSettingsSection').style.display = 'block';
});

document.getElementById('backToSettings').addEventListener('click', () => {
    document.getElementById('businessSettingsSection').style.display = 'none';
    document.getElementById('settingsSection').style.display = 'block';
});

// Add event listener for back button press
window.addEventListener('load', function() {
    if (window.history && window.history.pushState) {
        window.addEventListener('popstate', function() {
            // Get all section elements
            const sections = [
                document.getElementById('homeSection'),
                document.getElementById('todosContainer'),
                document.getElementById('productSection'),
                document.getElementById('transactionSection'),
                document.getElementById('transactionSection2'),
                document.getElementById('settingsSection')
                
            ];
            document.getElementById('businessSettingsBtn').addEventListener('click', function() {
                // Hide all sections
                const sections = [
                    document.getElementById('homeSection'),
                    document.getElementById('todosContainer'),
                    document.getElementById('productSection'),
                    document.getElementById('transactionSection'),
                    document.getElementById('transactionSection2'),
                    document.getElementById('settingsSection')
                ];
                sections.forEach(section => {
                    if (section) section.style.display = 'none';
                });
                document.getElementById('businessSettingsSection').style.display = 'block';
            });

            // Check if any section other than home is visible
            const isNotHome = sections.some((section, index) => 
                index > 0 && section && section.style.display !== 'none'
            );

            if (isNotHome) {
                // Prevent default back action
                history.pushState(null, '', window.location.pathname);
                
                // Hide all sections
                sections.forEach(section => {
                    if (section) section.style.display = 'none';
                });
                
                // Show home section
                if (sections[0]) sections[0].style.display = 'block';
                
                // Update active navigation button
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.getElementById('homeNavBtn').classList.add('active');
            }
        });

        // Initial state
        history.pushState(null, '', window.location.pathname);
    }
});

// Add event listener for Android back button
window.addEventListener('popstate', function(event) {
    // Hide todo form and container when navigating back
    document.getElementById('todoForm').style.display = 'none';
    document.getElementById('todosContainer').style.display = 'none';
    
    // Show home section
    document.getElementById('homeSection').style.display = 'block';
    
    // Update active navigation button
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('homeNavBtn').classList.add('active');
});

function updateProductTable() {
    const productTableBody = document.getElementById('productTableBody');
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const productRef = firebase.database().ref(`todos/${user.uid}/products`);
    
    productRef.on('value', snapshot => {
        productTableBody.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const product = childSnapshot.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.sku}</td>
                <td>${product.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${product.sellingPrice.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${(product.sellingPrice - product.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${product.unit}</td>
                <td>${product.category}</td>
                
                <td>
                    <button onclick="editProduct('${product.sku}')" class="edit-btn">Edit</button>
                    <button onclick="deleteProduct('${product.sku}')" class="delete-product-btn">Delete</button>
                    <button onclick="addToTransaction('${product.sku}')" class="add-transaction-btn">Add Transaction</button>
                </td>
            `;
            
            const addToTransactionBtn = row.querySelector('.add-to-transaction-btn');
            addToTransactionBtn.addEventListener('click', () => showQuantityPopup(product));
            
            productTableBody.appendChild(row);
        });
    });
}

// Initialize transaction tables when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase Auth to initialize
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            updateTransactionTable();
            updateTransactionTable2();
        }
    });
});

function updateTransactionTable2() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const transactionTableBody2 = document.getElementById('transactionTableBody2');
    const transactionRef = firebase.database().ref(`todos/${user.uid}/transactions2`);
    
    // Clear existing table content
    transactionTableBody2.innerHTML = '';
    
    // Add real-time listener for transactions
    transactionRef.on('child_added', (snapshot) => {
        const transaction = snapshot.val();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.product}</td>
            <td>${transaction.sku}</td>
            <td>${transaction.quantity}</td>
            <td>${transaction.price}</td>
            <td>${transaction.total}</td>
        `;
        transactionTableBody2.appendChild(row);
    });
    
    // Remove existing Delete All button if it exists
    const existingDeleteBtn = document.querySelector('#deleteAllTransactionsBtn2');
    if (existingDeleteBtn) {
        existingDeleteBtn.remove();
    }
    
    // Create new Delete All button
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.textContent = 'Delete All';
    deleteAllBtn.id = 'deleteAllTransactionsBtn2';
    deleteAllBtn.className = 'btn';
    deleteAllBtn.style.width = '100%';
    deleteAllBtn.style.marginTop = '1rem';
    deleteAllBtn.style.backgroundColor = '#ef4444';
    deleteAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all transactions in Section 2?')) {
            await firebase.database().ref(`todos/${user.uid}/transactions2`).remove();
        }
    });
    
    // Add the button after the table
    const transactionSection2 = document.getElementById('transactionSection2');
    transactionSection2.appendChild(deleteAllBtn);
    
    transactionRef.off('value');
    transactionRef.on('value', snapshot => {
        transactionTableBody2.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const transaction = childSnapshot.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <button class="delete-transaction-btn" data-id="${childSnapshot.key}">
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                            
                        </svg>
                    </button>
                    ${new Date(transaction.date).toLocaleDateString()}
                </td>
                <td>${transaction.product}</td>
                <td>${transaction.sku || 'N/A'}</td>
                <td>${transaction.quantity}</td>
                <td>${transaction.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${transaction.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
            `;

            const deleteBtn = row.querySelector('.delete-transaction-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this transaction?')) {
                    const user = firebase.auth().currentUser;
                    if (!user) return;
                    firebase.database().ref(`todos/${user.uid}/transactions2`).child(childSnapshot.key).remove()
                        .catch(error => console.error('Error deleting transaction:', error));
                }
            });

            transactionTableBody2.appendChild(row);
        });
    });
}

document.getElementById('menuToggle').addEventListener('click', function() {
    document.getElementById('navLinks').classList.toggle('show');
});

// Add event listeners to all nav buttons to close menu when clicked
const navButtons = document.querySelectorAll('.nav-btn');
navButtons.forEach(button => {
    button.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            document.getElementById('navLinks').classList.remove('show');
        }
    });
});

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    const navLinks = document.getElementById('navLinks');
    const menuToggle = document.getElementById('menuToggle');
    
    if (!navLinks.contains(event.target) && !menuToggle.contains(event.target) && window.innerWidth <= 768) {
        navLinks.classList.remove('show');
    }
});

// Update menu visibility on window resize
window.addEventListener('resize', function() {
    const navLinks = document.getElementById('navLinks');
    if (window.innerWidth > 768) {
        navLinks.classList.remove('show');
    }
});

function updateTransactionTable() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const transactionTableBody = document.getElementById('transactionTableBody');
    const transactionRef = firebase.database().ref(`todos/${user.uid}/transactions`);
    
    // Clear existing table content
    transactionTableBody.innerHTML = '';
    
    // Add real-time listener for transactions
    transactionRef.on('child_added', (snapshot) => {
        const transaction = snapshot.val();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.product}</td>
            <td>${transaction.sku || 'N/A'}</td>
            <td>${transaction.quantity}</td>
            <td>${transaction.price}</td>
            <td>${transaction.total}</td>
        `;
        transactionTableBody.appendChild(row);
    });
    
    // Remove existing Delete All button if it exists
    const existingDeleteBtn = document.querySelector('#deleteAllTransactionsBtn');
    if (existingDeleteBtn) {
        existingDeleteBtn.remove();
    }
    
    // Create new Delete All button
    const deleteAllBtn = document.createElement('button');
    deleteAllBtn.textContent = 'Delete All';
    deleteAllBtn.id = 'deleteAllTransactionsBtn';
    deleteAllBtn.className = 'btn';
    deleteAllBtn.style.width = '100%';
    deleteAllBtn.style.marginTop = '1rem';
    deleteAllBtn.style.backgroundColor = '#ef4444';
    deleteAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all transactions?')) {
            const user = firebase.auth().currentUser;
            if (!user) return;
            await firebase.database().ref(`todos/${user.uid}/transactions`).remove();
        }
    });
    
    // Add the button after the table
    const transactionSection = document.getElementById('transactionSection');
    transactionSection.appendChild(deleteAllBtn);
    
    // Remove existing listener if any
    transactionRef.off('value');
    
    // Add new listener
    transactionRef.on('value', snapshot => {
        transactionTableBody.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const transaction = childSnapshot.val();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <button class="delete-transaction-btn" data-id="${childSnapshot.key}">
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                            
                            
                        </svg>
                    </button>
                    ${new Date(transaction.date).toLocaleDateString()}
                </td>
                <td>${transaction.product}</td>
                <td>${transaction.sku || 'N/A'}</td>
                <td>${transaction.quantity}</td>
                <td>${transaction.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${transaction.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
            `;

            const deleteBtn = row.querySelector('.delete-transaction-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this transaction?')) {
                    const user = firebase.auth().currentUser;
                    if (!user) return;
                    firebase.database().ref(`todos/${user.uid}/transactions`).child(childSnapshot.key).remove()
                        .catch(error => console.error('Error deleting transaction:', error));
                }
            });

            transactionTableBody.appendChild(row);
        });
    });
}
        

        
    
        
    
        // Initialize the app
        const app = new TodoApp();

        // Add event listeners for navigation buttons to handle business settings auto-back
        document.getElementById('homeNavBtn').addEventListener('click', () => {
            if (document.getElementById('businessSettingsSection').style.display === 'block') {
                backToSettings();
            }
        });

        document.getElementById('todoNavBtn').addEventListener('click', () => {
            if (document.getElementById('businessSettingsSection').style.display === 'block') {
                backToSettings();
            }
        });

        document.getElementById('productNavBtn').addEventListener('click', () => {
            if (document.getElementById('businessSettingsSection').style.display === 'block') {
                backToSettings();
            }
        });

        document.getElementById('transactionNavBtn').addEventListener('click', () => {
            if (document.getElementById('businessSettingsSection').style.display === 'block') {
                backToSettings();
            }
        });
    // Settings functionality
    const settingsSection = document.getElementById('settingsSection');
    const businessSettingsForm = document.getElementById('businessSettingsForm');
    const settingsNavBtn = document.getElementById('settingsNavBtn');

    // Function to hide business settings and show settings section
    function backToSettings() {
        document.getElementById('businessSettingsSection').style.display = 'none';
        settingsSection.style.display = 'block';
    }

    // Navigation handling for settings
    settingsNavBtn.addEventListener('click', async () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        settingsNavBtn.classList.add('active');
        
        // Hide all sections
        document.getElementById('todoForm').style.display = 'none';
        document.getElementById('todosContainer').style.display = 'none';
        document.getElementById('productSection').style.display = 'none';
        document.getElementById('transactionSection').style.display = 'none';
        document.getElementById('transactionSection2').style.display = 'none';
        document.getElementById('homeSection').style.display = 'none';
        document.getElementById('businessSettingsSection').style.display = 'none';
        
        // Show settings section
        settingsSection.style.display = 'block';

        // Load customers and settings from Firebase
        const user = firebase.auth().currentUser;
        loadCustomers(); // Load customer list when settings section is shown
        if (user) {
            const settingsSnapshot = await firebase.database().ref(`todos/${user.uid}/settings`).once('value');
            const settings = settingsSnapshot.val() || {};
            
            // Update form fields with saved settings
            const businessNameInput = document.getElementById('businessName');
            const businessAddressInput = document.getElementById('businessAddress');
            const businessEmailInput = document.getElementById('businessEmail');

            if (businessNameInput) businessNameInput.value = settings.companyName || '';
            if (businessAddressInput) businessAddressInput.value = settings.businessAddress || '';
            if (businessEmailInput) businessEmailInput.value = settings.businessEmail || '';
        }
    });

    // Load settings from Firebase
    async function loadSettings() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            const settingsRef = firebase.database().ref(`users/${user.uid}/settings`);
            const snapshot = await settingsRef.once('value');
            const settings = snapshot.val() || {};

            // Populate form fields
            document.getElementById('businessName').value = settings.companyName || '';
            // Add more field population as needed
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Save settings to Firebase
    businessSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Please login to save settings');
            return;
        }

        const settings = {
            companyName: document.getElementById('businessName')?.value.trim() || '',
            businessAddress: document.getElementById('businessAddress')?.value.trim() || '',
            businessEmail: document.getElementById('businessEmail')?.value.trim() || '',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        try {
            await firebase.database().ref(`todos/${user.uid}/settings`).update(settings);
            alert('Business settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings. Please try again.');
        }
    });

    // Load business settings from Firebase
    async function loadBusinessSettings() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            const settingsRef = firebase.database().ref(`users/${user.uid}/settings`);
            const snapshot = await settingsRef.once('value');
            const settings = snapshot.val() || {};

            // Populate business form fields
            const businessNameInput = document.getElementById('businessName');
            const businessAddressInput = document.getElementById('businessAddress');
            const businessEmailInput = document.getElementById('businessEmail');

            if (businessNameInput) businessNameInput.value = settings.companyName || '';
            if (businessAddressInput) businessAddressInput.value = settings.businessAddress || '';
            if (businessEmailInput) businessEmailInput.value = settings.businessEmail || '';
        } catch (error) {
            console.error('Error loading business settings:', error);
        }
    }

    // Load business settings when settings section is shown
    document.addEventListener('DOMContentLoaded', () => {
        loadBusinessSettings();
    });
            // Customer management functions
            function saveCustomer(event) {
                event.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert('Please login to save customer');
                    return;
                }
                const customerName = document.getElementById('customerName').value;
                const customerPhone = document.getElementById('customerPhone').value;
                const customerAddress = document.getElementById('customerAddress').value;
                const customerId = document.getElementById('customerId').value || Date.now().toString();

                firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).set({
                    name: customerName,
                    phone: customerPhone,
                    address: customerAddress,
                    id: customerId
                }).then(() => {
                    alert('Customer saved successfully!');
                    document.getElementById('customerSettingsForm').reset();
                    loadCustomers();
                }).catch(error => {
                    console.error('Error saving customer:', error);
                    alert('Error saving customer');
                });
            }

            function loadCustomers() {
                const user = firebase.auth().currentUser;
                if (!user) return;

                const tableBody = document.getElementById('customerTableBody');
                firebase.database().ref(`todos/${user.uid}/customers`).on('value', snapshot => {
                    tableBody.innerHTML = '';
                    snapshot.forEach(childSnapshot => {
                        const customer = childSnapshot.val();
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${customer.id}</td>
                            <td>${customer.name}</td>
                            <td>${customer.phone || 'N/A'}</td>
                            <td>${customer.address || 'N/A'}</td>
                            <td>
                                <button onclick="editCustomer('${customer.id}')" class="edit-btn">Edit</button>
                                <button onclick="deleteCustomer('${customer.id}')" class="delete-product-btn">Delete</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                });
            }

            function editCustomer(customerId) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert('Please login to edit customer');
                    return;
                }

                firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).once('value').then(snapshot => {
                    const customer = snapshot.val();
                    document.getElementById('customerName').value = customer.name;
                    document.getElementById('customerPhone').value = customer.phone || '';
                    document.getElementById('customerAddress').value = customer.address || '';
                    document.getElementById('customerId').value = customer.id;
                });
            }

            function deleteCustomer(customerId) {
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert('Please login to delete customer');
                    return;
                }

                if (confirm('Are you sure you want to delete this customer?')) {
                    firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).remove()
                        .then(() => {
                            alert('Customer deleted successfully!');
                            loadCustomers();
                        })
                        .catch(error => {
                            console.error('Error deleting customer:', error);
                            alert('Error deleting customer');
                        });
                }
            }

            // Event listeners
            document.getElementById('customerSettingsForm').addEventListener('submit', saveCustomer);
            document.addEventListener('DOMContentLoaded', () => {
                loadCustomers();
            });