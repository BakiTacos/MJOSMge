const firebaseConfig = {
    apiKey: "AIzaSyBvtvkgzoNWT2gVGl3zLETYPnhKUP-dGc8",
    authDomain: "mjosmgedb.firebaseapp.com",
    databaseURL: "https://mjosmgedb-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "mjosmgedb",
    storageBucket: "mjosmgedb.appspot.com",
    messagingSenderId: "92899208044",
    appId: "1:92899208044:web:c765306470956717952149",
    measurementId: "G-5045ZX790R"
};

firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.database();


        class TodoApp {
            constructor() {
                this.products = [];
                this.todos = [];
                this.form = document.getElementById('todoForm');
                this.input = document.getElementById('todoInput');
                this.addCategoryList = document.getElementById('addCategoryList');
                this.praCategoryList = document.getElementById('praCategoryList');
                this.rmCategoryList = document.getElementById('rmCategoryList');
                this.zhCategoryList = document.getElementById('zhCategoryList');
                this.mainTodoList = document.getElementById('mainTodoList');
                this.userInfo = document.getElementById('userInfo');
                this.userEmail = document.getElementById('userEmail');
                this.todosContainer = document.getElementById('todosContainer');
                this.loginForm = document.getElementById('loginForm');
                this.registerForm = document.getElementById('registerForm');
                this.authForms = document.getElementById('authForms');
                this.logoutBtn = document.getElementById('logoutBtn');
                this.currentUser = null;
                this.init();
            }
    
            async init() {
                this.setupNavigation();
                this.setupProductManagement();
                this.setupAuthUI();
                this.setupAuthListeners();
                this.form.addEventListener('submit', (e) => this.handleSubmit(e));
                auth.onAuthStateChanged(user => this.handleAuthStateChange(user));
            }
    
            setupAuthUI() {
                document.getElementById('showRegister').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.loginForm.style.display = 'none';
                    this.registerForm.style.display = 'block';
                });
    
                document.getElementById('showLogin').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.registerForm.style.display = 'none';
                    this.loginForm.style.display = 'block';
                });
    
                this.logoutBtn.addEventListener('click', () => this.handleLogout());
            }
    
            setupAuthListeners() {
                this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
                this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            }
    
            async handleLogin(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;
    
                try {
                    const userCredential = await auth.signInWithEmailAndPassword(email, password);
                    this.loginForm.reset();
                } catch (error) {
                    alert('Login failed: ' + error.message);
                }
            }
    
            async handleRegister(e) {
                e.preventDefault();
                const email = document.getElementById('registerEmail').value;
                const password = document.getElementById('registerPassword').value;
    
                try {
                    await auth.createUserWithEmailAndPassword(email, password);
                    this.registerForm.reset();
                } catch (error) {
                    alert('Registration failed: ' + error.message);
                }
            }
    
            async handleLogout() {
                try {
                    await auth.signOut();
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            }
    
            handleAuthStateChange(user) {
                this.currentUser = user;
                if (user) {
                    this.loadProducts();
                    this.userEmail.textContent = user.email;
                    this.authForms.style.display = 'none';
                    this.userInfo.style.display = 'block';
                    document.querySelector('.navbar').style.display = 'flex';
    
                    // Show home section and hide others
                    document.getElementById('homeSection').style.display = 'block';
                    this.form.style.display = 'none';
                    this.todosContainer.style.display = 'none';
                    document.getElementById('productSection').style.display = 'none';
                    document.getElementById('transactionSection').style.display = 'none';
                    document.getElementById('transactionSection2').style.display = 'none';
                    document.getElementById('settingsSection').style.display = 'none';
    
                    // Set home nav button as active
                    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById('homeNavBtn').classList.add('active');
    
                    this.loadTodos(); // Load todos only for the logged-in user
                } else {
                    this.authForms.style.display = 'block';
                    this.userInfo.style.display = 'none';
                    this.form.style.display = 'none';
                    this.todosContainer.style.display = 'none';
                    document.querySelector('.navbar').style.display = 'none';
                    document.getElementById('homeSection').style.display = 'none';
                    document.getElementById('productSection').style.display = 'none';
                    document.getElementById('transactionSection').style.display = 'none';
                    document.getElementById('transactionSection2').style.display = 'none';
                    document.getElementById('settingsSection').style.display = 'none';
                    this.todos = [];
                    this.renderTodos();
                }
            }
    
            async handleSubmit(e) {
                e.preventDefault();
                const text = this.input.value.trim();
                if (text) {
                    await this.addTodo(text);
                    this.input.value = '';
                }
            }
    
            async addTodo(text) {
                if (!this.currentUser) return;
    
                try {
                    const newTodoRef = db.ref(`todos/${this.currentUser.uid}`).push();
                    let category = 'main';
                    if (text.toLowerCase().includes('add')) {
                        category = 'add';
                    } else if (text.toLowerCase().includes('pra')) {
                        category = 'pra';
                    } else if (text.toLowerCase().includes('rm')) {
                        category = 'rm';
                    } else if (text.toLowerCase().includes('zh')) {
                        category = 'zh';
                    }
                    await newTodoRef.set({
                        text,
                        completed: false,
                        category,
                        createdAt: Date.now()
                    });
                } catch (error) {
                    console.error('Error adding todo:', error);
                }
            }
    
            async toggleTodo(todoId) {
                if (!this.currentUser) return;
    
                try {
                    await this.deleteTodo(todoId);
                } catch (error) {
                    console.error('Error toggling todo:', error);
                }
            }
    
            async deleteTodo(todoId) {
                if (!this.currentUser) return;
    
                try {
                    await db.ref(`todos/${this.currentUser.uid}/${todoId}`).remove();
                } catch (error) {
                    console.error('Error deleting todo:', error);
                }
            }
    
            setupNavigation() {
                const homeNavBtn = document.getElementById('homeNavBtn');
                const todoNavBtn = document.getElementById('todoNavBtn');
                const productNavBtn = document.getElementById('productNavBtn');
                const transactionNavBtn = document.getElementById('transactionNavBtn');
                const settingsNavBtn = document.getElementById('settingsNavBtn');

                const homeSection = document.getElementById('homeSection');
                const todoSection = document.getElementById('todosContainer');
                const productSection = document.querySelector('.product-section');
                const transactionSection = document.getElementById('transactionSection');
                const transactionSection2 = document.getElementById('transactionSection2');
                const settingsSection = document.getElementById('settingsSection');

                const sections = [homeSection, todoSection, productSection, transactionSection, transactionSection2, settingsSection];
                const navButtons = [homeNavBtn, todoNavBtn, productNavBtn, transactionNavBtn, settingsNavBtn];

                function showSection(activeSection, activeButton) {
                    sections.forEach(section => {
                        if (section) {
                            if (section === transactionSection2) {
                                section.style.display = activeSection === transactionSection ? 'block' : 'none';
                            } else {
                                section.style.display = section === activeSection ? 'block' : 'none';
                            }
                        }
                    });
                    navButtons.forEach(button => button.classList.remove('active'));
                    activeButton.classList.add('active');
                    
                    // Control todo form visibility
                    const todoForm = document.getElementById('todoForm');
                    todoForm.style.display = activeSection === todoSection ? 'block' : 'none';
                }

                homeNavBtn.addEventListener('click', () => showSection(homeSection, homeNavBtn));
                todoNavBtn.addEventListener('click', () => showSection(todoSection, todoNavBtn));
                productNavBtn.addEventListener('click', () => showSection(productSection, productNavBtn));
                transactionNavBtn.addEventListener('click', () => showSection(transactionSection, transactionNavBtn));
                settingsNavBtn.addEventListener('click', () => showSection(settingsSection, settingsNavBtn));
            }

            setupProductManagement() {
                const productForm = document.getElementById('productForm');
                const searchInput = document.getElementById('productSearchInput');
                const categoryButtons = document.querySelectorAll('.category-btn');
                const sortButtons = document.querySelectorAll('.sort-btn');

                // Add sorting functionality
                sortButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        // Remove active class from all sort buttons
                        sortButtons.forEach(btn => btn.classList.remove('active'));
                        // Add active class to clicked button
                        button.classList.add('active');

                        const sortBy = button.dataset.sort;
                        const order = button.dataset.order;
                        
                        const sortedProducts = [...this.products].sort((a, b) => {
                            if (sortBy === 'name') {
                                return order === 'asc' ? 
                                    a.name.localeCompare(b.name) : 
                                    b.name.localeCompare(a.name);
                            } else if (sortBy === 'sellingPrice') {
                                const priceA = a.sellingPrice || a.price;
                                const priceB = b.sellingPrice || b.price;
                                return order === 'asc' ? priceA - priceB : priceB - priceA;
                            } else if (sortBy === 'profitLoss') {
                                const profitLossA = a.sellingPrice - a.price - 1000 - (a.sellingPrice * 0.125);
                                const profitLossB = b.sellingPrice - b.price - 1000 - (b.sellingPrice * 0.125);
                                return order === 'asc' ? profitLossA - profitLossB : profitLossB - profitLossA;
                            }
                            return 0;
                        });
                        
                        this.renderFilteredProducts(sortedProducts);
                    });
                });
                
                productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
                
                searchInput.addEventListener('input', () => {
                    const searchTerm = searchInput.value.toLowerCase();
                    const filteredProducts = this.products.filter(product => 
                        product.name.toLowerCase().includes(searchTerm) ||
                        product.sku.toLowerCase().includes(searchTerm)
                    );
                    this.renderFilteredProducts(filteredProducts);
                });

                categoryButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        categoryButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        const category = button.dataset.category;
                        const filteredProducts = category === 'all' ? 
                            this.products : 
                            this.products.filter(product => product.category === category);
                        this.renderFilteredProducts(filteredProducts);
                    });
                });
            }

            renderFilteredProducts(products) {
                const tableBody = document.getElementById('productTableBody');
                tableBody.innerHTML = '';
                
                products.forEach(product => {
                    const formattedPrice = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(product.price);

                    const formattedSellingPrice = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(product.sellingPrice || product.price);
                    
                    const profitLoss = product.sellingPrice - product.price - 1000 - (product.sellingPrice * 0.125); // Fixed 12% fee
                    const formattedProfitLoss = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(profitLoss);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${product.name}</td>
                        <td>${formattedPrice}</td>
                        <td>${formattedSellingPrice}</td>
                        <td>${formattedProfitLoss}</td>
                        <td>${product.priceUnit === 'dozen' ? 'Per Dozen' : 'Per Unit'}</td>
                        <td>${product.category || 'Uncategorized'}</td>
                        <td>${product.sku}</td>
                        <td>
                            <button class="edit-btn">Edit</button>
                            <button class="delete-product-btn">Delete</button>
                            <button class="add-to-transaction-btn">Add To Transaction</button>
                        </td>
                    `;

                    const editBtn = tr.querySelector('.edit-btn');
                    const deleteBtn = tr.querySelector('.delete-product-btn');
                    const addToTransactionBtn = tr.querySelector('.add-to-transaction-btn');

                    editBtn.addEventListener('click', () => this.handleEditProduct(product.id));
                    deleteBtn.addEventListener('click', () => this.handleDeleteProduct(product.id));
                    addToTransactionBtn.addEventListener('click', () => showQuantityPopup(product));

                    tableBody.appendChild(tr);
                });
            }

            async handleProductSubmit(e) {
                e.preventDefault();
                try {
                    const name = document.getElementById('productName').value.trim();
                    const price = parseFloat(document.getElementById('productPrice').value);
                    const sellingPrice = parseFloat(document.getElementById('productSellingPrice').value);
                    const sku = document.getElementById('productSKU').value.trim() || '-';
                    const priceUnit = document.getElementById('priceUnit').value;
                    const category = document.getElementById('productCategory').value;

                    const newProductRef = db.ref(`todos/${this.currentUser.uid}/products`).push();
                    await newProductRef.set({
                        name,
                        price,
                        sellingPrice,
                        sku,
                        priceUnit,
                        category,
                        createdAt: Date.now()
                    });

                    productForm.reset();
                } catch (error) {
                    console.error('Error adding product:', error);
                }
            }

            loadProducts() {
                if (!this.currentUser) return;

                db.ref(`todos/${this.currentUser.uid}/products`).on('value', (snapshot) => {
                    const products = [];
                    snapshot.forEach((childSnapshot) => {
                        products.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    this.products = products;
                    this.renderProducts();
                });
            }

            async deleteProduct(productId) {
                if (!this.currentUser) return;

                try {
                    await db.ref(`todos/${this.currentUser.uid}/products/${productId}`).remove();
                } catch (error) {
                    console.error('Error deleting product:', error);
                }
            }

            async updateProduct(productId, updatedData) {
                if (!this.currentUser) return;

                try {
                    await db.ref(`todos/${this.currentUser.uid}/products/${productId}`).update(updatedData);
                } catch (error) {
                    console.error('Error updating product:', error);
                }
            }

            renderProducts() {
                const tableBody = document.getElementById('productTableBody');
                tableBody.innerHTML = '';
                
                this.products.forEach(product => {
                    const formattedPrice = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(product.price);

                    const formattedSellingPrice = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(product.sellingPrice || product.price);
                    
                    const profitLoss = product.sellingPrice - product.price - 1000 - (product.sellingPrice * 0.125); // Fixed 12% fee
                    const formattedProfitLoss = new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR'
                    }).format(profitLoss);

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${product.name}</td>
                        <td>${formattedPrice}</td>
                        <td>${formattedSellingPrice}</td>
                        <td>${formattedProfitLoss}</td>
                        <td>${product.priceUnit === 'dozen' ? 'Per Dozen' : 'Per Unit'}</td>
                        <td>${product.category || 'Uncategorized'}</td>
                        <td>${product.sku}</td>
                        <td>
                            <button class="edit-btn">Edit</button>
                            <button class="delete-product-btn">Delete</button>
                            <button class="add-to-transaction-btn">Add To Transaction</button>
                        </td>
                    `;

                    const editBtn = tr.querySelector('.edit-btn');
                    const deleteBtn = tr.querySelector('.delete-product-btn');
                    const addToTransactionBtn = tr.querySelector('.add-to-transaction-btn');

                    editBtn.addEventListener('click', () => this.handleEditProduct(product.id));
                    deleteBtn.addEventListener('click', () => this.handleDeleteProduct(product.id));
                    addToTransactionBtn.addEventListener('click', () => showQuantityPopup(product));

                    tableBody.appendChild(tr);
                });
            }

            handleEditProduct(productId) {
                const product = this.products.find(p => p.id === productId);
                if (!product) return;

                const newName = prompt('Enter new name:', product.name);
                const newPrice = parseFloat(prompt('Enter new price in Rupiah:', product.price));
                const newSellingPrice = parseFloat(prompt('Enter new selling price in Rupiah:', product.sellingPrice || product.price));
                const newSKU = prompt('Enter new SKU:', product.sku);
                const newPriceUnit = prompt('Enter price unit (unit/dozen):', product.priceUnit);

                if (newName && !isNaN(newPrice) && !isNaN(newSellingPrice)) {
                    this.updateProduct(productId, {
                        name: newName,
                        price: newPrice,
                        sellingPrice: newSellingPrice,
                        sku: newSKU || '-',
                        priceUnit: newPriceUnit === 'dozen' ? 'dozen' : 'unit'
                    });

                }
            }

            handleDeleteProduct(productId) {
                if (confirm('Are you sure you want to delete this product?')) {
                    this.deleteProduct(productId);
                }
            }

            loadTodos() {
                if (!this.currentUser) return;
    
                db.ref(`todos/${this.currentUser.uid}`).orderByChild('createdAt').on('value', (snapshot) => {
                    const todos = [];
                    snapshot.forEach((childSnapshot) => {
                        const todo = { id: childSnapshot.key, ...childSnapshot.val() };
                        todos.push(todo);
                    });
                    this.todos = todos.reverse(); // Display newest first
                    this.renderTodos();
                });
            }
    
            createTodoElement(todo) {
                const li = document.createElement('li');
                li.className = 'todo-item';
    
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = false;
                checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
    
                const span = document.createElement('span');
                span.textContent = todo.text;
    
                li.appendChild(checkbox);
                li.appendChild(span);
    
                if (todo.category === 'pra' || todo.category === 'zh') {
                    const shareBtn = document.createElement('button');
                    shareBtn.textContent = 'Share on WhatsApp';
                    shareBtn.className = 'btn';
                    shareBtn.style.marginLeft = 'auto';
                    shareBtn.style.fontSize = '0.8rem';
                    shareBtn.style.padding = '0.5rem 1rem';
                    shareBtn.addEventListener('click', () => {
                        const text = encodeURIComponent(todo.text);
                        window.open(`https://wa.me/+6282110683255?text=${text}`);
                    });
                    li.appendChild(shareBtn);
                }

                return li;
            }

            renderTodos() {
                const addCategoryTodos = this.todos.filter(todo => todo.category === 'add');
                const praCategoryTodos = this.todos.filter(todo => todo.category === 'pra');
                const rmCategoryTodos = this.todos.filter(todo => todo.category === 'rm');
                const zhCategoryTodos = this.todos.filter(todo => todo.category === 'zh');
                const mainTodos = this.todos.filter(todo => todo.category === 'main');

                this.addCategoryList.innerHTML = '';
                this.praCategoryList.innerHTML = '';
                this.rmCategoryList.innerHTML = '';
                this.zhCategoryList.innerHTML = '';
                this.mainTodoList.innerHTML = '';

                addCategoryTodos.forEach(todo => {
                    this.addCategoryList.appendChild(this.createTodoElement(todo));
                });

                praCategoryTodos.forEach(todo => {
                    this.praCategoryList.appendChild(this.createTodoElement(todo));
                });

                rmCategoryTodos.forEach(todo => {
                    this.rmCategoryList.appendChild(this.createTodoElement(todo));
                });

                zhCategoryTodos.forEach(todo => {
                    this.zhCategoryList.appendChild(this.createTodoElement(todo));
                });

                // Add Share All button for WA category
                if (praCategoryTodos.length > 0) {
                    const shareAllBtn = document.createElement('button');
                    shareAllBtn.textContent = 'Share All to WhatsApp';
                    shareAllBtn.className = 'btn';
                    shareAllBtn.style.width = '100%';
                    shareAllBtn.style.marginTop = '1rem';
                    shareAllBtn.addEventListener('click', () => {
                        const allTasks = praCategoryTodos.map(todo => todo.text).join('\n');
                        const text = encodeURIComponent(allTasks);
                        window.open(`https://wa.me/+6282110683255?text=${text}`);
                    });
                    this.praCategoryList.appendChild(shareAllBtn);

                    const deleteAllBtn = document.createElement('button');
                    deleteAllBtn.textContent = 'Delete All';
                    deleteAllBtn.className = 'btn';
                    deleteAllBtn.style.width = '100%';
                    deleteAllBtn.style.marginTop = '1rem';
                    deleteAllBtn.style.backgroundColor = '#ef4444';
                    deleteAllBtn.addEventListener('click', async () => {
                        if (confirm('Are you sure you want to delete all tasks in Pra category?')) {
                            for (const todo of praCategoryTodos) {
                                await this.deleteTodo(todo.id);
                            }
                        }
                    });
                    this.praCategoryList.appendChild(deleteAllBtn);
                }

                // Add Share All button for Zhonguo List
                if (zhCategoryTodos.length > 0) {
                    const shareAllBtn = document.createElement('button');
                    shareAllBtn.textContent = 'Share All to WhatsApp';
                    shareAllBtn.className = 'btn';
                    shareAllBtn.style.width = '100%';
                    shareAllBtn.style.marginTop = '1rem';
                    shareAllBtn.addEventListener('click', () => {
                        const allTasks = zhCategoryTodos.map(todo => todo.text).join('\n');
                        const text = encodeURIComponent(allTasks);
                        window.open(`https://wa.me/+6282110683255?text=${text}`);
                    });
                    this.zhCategoryList.appendChild(shareAllBtn);

                    const deleteAllBtn = document.createElement('button');
                    deleteAllBtn.textContent = 'Delete All';
                    deleteAllBtn.className = 'btn';
                    deleteAllBtn.style.width = '100%';
                    deleteAllBtn.style.marginTop = '1rem';
                    deleteAllBtn.style.backgroundColor = '#ef4444';
                    deleteAllBtn.addEventListener('click', async () => {
                        if (confirm('Are you sure you want to delete all tasks in Zhonguo category?')) {
                            for (const todo of zhCategoryTodos) {
                                await this.deleteTodo(todo.id);
                            }
                        }
                    });
                    this.zhCategoryList.appendChild(deleteAllBtn);
                }

                mainTodos.forEach(todo => {
                    this.mainTodoList.appendChild(this.createTodoElement(todo));
                });
            }
        }