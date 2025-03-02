function showExportPopup(section = 'transactions') {
    currentExportSection = section;
    const exportPopup = document.getElementById('exportPopup');
    const overlay = document.getElementById('quantityPopupOverlay');
    const customerSelect = document.getElementById('customerSelect');

    // Clear previous options
    customerSelect.innerHTML = '<option value="">Select a customer...</option>';

    // Fetch customers from Firebase
    const user = firebase.auth().currentUser;
    if (!user) return;

    firebase.database().ref(`todos/${user.uid}/customers`).once('value')
        .then(snapshot => {
            snapshot.forEach(childSnapshot => {
                const customer = childSnapshot.val();
                const option = document.createElement('option');
                option.value = childSnapshot.key;
                option.textContent = customer.name;
                customerSelect.appendChild(option);
            });
        });

    exportPopup.style.display = 'block';
    overlay.style.display = 'block';
}

function hideExportPopup() {
    document.getElementById('exportPopup').style.display = 'none';
    document.getElementById('quantityPopupOverlay').style.display = 'none';
}

document.getElementById('exportTransactionBtn').addEventListener('click', () => showExportPopup('transactions'));
document.getElementById('exportTransactionBtn2').addEventListener('click', () => showExportPopup('transactions2'));
document.getElementById('cancelExport').addEventListener('click', hideExportPopup);
document.getElementById('quantityPopupOverlay').addEventListener('click', hideExportPopup);

document.getElementById('confirmExportWithCustomer').addEventListener('click', async () => {
    const customerId = document.getElementById('customerSelect').value;
    if (!customerId) {
        alert('Please select a customer');
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Fetch customer details - Fixed the path to include user.uid
        const customerSnapshot = await firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).once('value');
        const customer = customerSnapshot.val();

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Fetch transactions from the correct section
        const transactionSnapshot = await firebase.database().ref(`todos/${user.uid}/${currentExportSection}`).once('value');
        const transactions = [];
        transactionSnapshot.forEach(childSnapshot => {
            transactions.push(childSnapshot.val());
        });

        // Export with customer info
        const exportData = {
            customer: customer,
            transactions: transactions
        };
        downloadCSV(exportData, `transactions_${customer.name}_${new Date().toISOString()}.csv`);
        hideExportPopup();
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data: ' + error.message);
    }
});

document.getElementById('confirmExportSimple').addEventListener('click', async () => {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Fetch transactions only from the correct section
        const transactionSnapshot = await firebase.database().ref(`todos/${user.uid}/${currentExportSection}`).once('value');
        const transactions = [];
        transactionSnapshot.forEach(childSnapshot => {
            transactions.push(childSnapshot.val());
        });

        // Export transactions only
        downloadCSV({ transactions: transactions }, `transactions_${new Date().toISOString()}.csv`);
        hideExportPopup();
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data');
    }
});

document.getElementById('confirmExportPDF').addEventListener('click', async function() {
    const customerId = document.getElementById('customerSelect').value;
    if (!customerId && !confirm('Do you want to proceed without customer information?')) {
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add business details at the top
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login to export PDF');
        return;
    }

    let businessName = 'Business Name';
    let businessAddress = '';
    let businessPhone = '';
    
    try {
        const settingsSnapshot = await firebase.database().ref(`todos/${user.uid}/settings`).once('value');
        const settings = settingsSnapshot.val() || {};
        businessName = settings.companyName || 'Business Name';
        businessAddress = settings.address || '';
        businessPhone = settings.phone || '';

        // Get transactions data
        const transactionsSnapshot = await firebase.database().ref(`todos/${user.uid}/${currentExportSection}`).once('value');
        const transactions = [];
        transactionsSnapshot.forEach(snapshot => {
            transactions.push(snapshot.val());
        });

        // Get customer data if customerId is provided
        let customerInfo = null;
        if (customerId) {
            const customerSnapshot = await firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).once('value');
            customerInfo = customerSnapshot.val();
            if (!customerInfo) {
                throw new Error('Customer not found');
            }

            customerInfo = customerSnapshot.val();
            if (!customerInfo) {
                throw new Error('Customer not found');
            }
        }

        // Header section
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(businessName, 20, 20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(settings.businessAddress || '', 20, 28);
        doc.text(businessAddress, 20, 27);
        doc.text(settings.businessEmail || '', 20, 34);
        doc.text(businessPhone, 20, 41);

        // Invoice title and number
        const currentDate = new Date();
        const dateStr = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '');
        const randomNumbers1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const randomNumbers2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `INVOICE-${randomNumbers1}${dateStr}${randomNumbers2}`;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' });
        doc.setFontSize(10);
        doc.text(invoiceNumber, pageWidth - 20, 27, { align: 'right' });
        
        // Customer information section
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('KEPADA:', 20, 50);
        doc.text('TANGGAL:', pageWidth - 70, 50);
        
        doc.setFont('helvetica', 'normal');
        const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(today, pageWidth - 20, 50, { align: 'right' });
        
        let customerYPosition = 57;
        if (customerId && customerInfo) {
            doc.text(customerInfo.name, 20, customerYPosition);
            if (customerInfo.address) {
                customerYPosition += 7;
                doc.text(customerInfo.address, 20, customerYPosition);
            }
            if (customerInfo.phone) {
                customerYPosition += 7;
                doc.text(`Telp: ${customerInfo.phone}`, 20, customerYPosition);
            }
        }

        // Transaction table
       
        const transactionRef = firebase.database().ref(`todos/${user.uid}/${currentExportSection}`);
        const transactionSnapshot = await transactionRef.once('value');
        const tableTransactions = [];
        transactionSnapshot.forEach(childSnapshot => {
            tableTransactions.push(childSnapshot.val());
        });
        
        const tableData = tableTransactions.map(transaction => [
            transaction.product,
            transaction.quantity,
            transaction.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }),
            transaction.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })
        ]);
        
        doc.autoTable({
            head: [["Nama Barang", "Jumlah", "Harga", "Total"]],
            body: tableData,
            startY: customerYPosition + 15,
            theme: 'grid',
            headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            styles: { fontSize: 10 }
        });
        
        // Calculate totals
        const subtotal = tableTransactions.reduce((sum, transaction) => sum + transaction.total, 0);
        const includePPN = document.getElementById('includePPN').checked;
        const tax = includePPN ? subtotal * 0.11 : 0; // 11% tax only if checkbox is checked
        const total = subtotal + tax;
        
        // Add totals section
        const finalY = doc.previousAutoTable.finalY + 5;
        doc.setFontSize(10);
        
        doc.text('Sub Total:', pageWidth - 90, finalY + 7);
        doc.text(subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, finalY + 7, { align: 'right' });
        
        let currentY = finalY + 14;
        
        if (includePPN) {
            doc.text('PPN 11%:', pageWidth - 90, currentY);
            doc.text(tax.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, currentY, { align: 'right' });
            currentY += 7;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text('Total:', pageWidth - 90, currentY);
        doc.text(total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, currentY, { align: 'right' });
        
        // Add signature section
        const signatureY = currentY + 19;
        doc.setFont('helvetica', 'normal');
        doc.text('Hormat Kami,', pageWidth - 20, signatureY, { align: 'right' });
        doc.line(pageWidth - 70, signatureY + 25, pageWidth - 20, signatureY + 25);
        doc.text(businessName, pageWidth - 20, signatureY + 32, { align: 'right' });
        
        // Save the PDF
        doc.save(`invoice-${invoiceNumber}.pdf`);
        
        // Close the popup
        document.getElementById('exportPopup').style.display = 'none';
        document.querySelector('.product-popup-overlay').style.display = 'none';
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
    }
});

document.getElementById('exportNota').addEventListener('click', async function() {
        const customerId = document.getElementById('customerSelect').value;
        const includePPN = document.getElementById('includePPN').checked;
        
        try {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Please login to export nota');
                return;
            }

            // Get business settings
            const settingsSnapshot = await firebase.database().ref(`todos/${user.uid}/settings`).once('value');
            const settings = settingsSnapshot.val() || {};
            const businessName = settings.companyName || 'TOKO DUNIA';
            const businessAddress = settings.businessAddress || 'JL. RAYA SEMANDING 30\nDAU - MALANG';
            const businessPhone = settings.phone || 'TELP. 0341 - 8686715';

            // Get transactions
            const transactionsSnapshot = await firebase.database().ref(`todos/${user.uid}/${currentExportSection}`).once('value');
            const transactions = [];
            transactionsSnapshot.forEach(snapshot => {
                transactions.push(snapshot.val());
            });

            // Create PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5'
            });

            // Set font
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);

            // Add business header
            doc.text(businessName, 10, 10);
            doc.setFontSize(10);
            if (businessAddress) {
                businessAddress.split('\n').forEach((line, index) => {
                    doc.text(line, 10, 15 + (index * 4));
                });
            }
            if (settings.businessEmail) {
                doc.text(settings.businessEmail, 10, 15 + (businessAddress ? businessAddress.split('\n').length * 4 : 0));
            }
            

            // Add nota number and date
            const currentDate = new Date();
            const dateStr = currentDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.text(`Tgl: ${dateStr}`, pageWidth - 10, 15, { align: 'right' });
            if (customerId) {
                const customerSnapshot = await firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).once('value');
                const customer = customerSnapshot.val();
                if (customer) {
                    doc.text(`Tuan: ${customer.name}`, pageWidth - 10, 20, { align: 'right' });
                }
            }
            const notaNumber = `NOTA NO. ${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            doc.text(notaNumber, 10, 40);

            // Add customer info if selected
            let yPos = 45;
            if (customerId) {
                const customerSnapshot = await firebase.database().ref(`todos/${user.uid}/customers/${customerId}`).once('value');
                const customer = customerSnapshot.val();
                if (customer && customer.address) {
                    doc.text(`Toko: ${customer.address}`, 10, yPos);
                    yPos += 5;
                }
            }

            // Add table headers with borders
            yPos += 5;
            const headers = ['BANYAKNYA', 'NAMA BARANG', 'HARGA', 'JUMLAH'];
            const columnWidths = [25, 60, 25, 25];
            const startX = 10;
            const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
            
            // Draw table header borders
            doc.rect(startX, yPos - 4, tableWidth, 6); // Header box
            let xPos = startX;
            headers.forEach((header, index) => {
                doc.text(header, xPos + 2, yPos, { align: 'left' });
                xPos += columnWidths[index];
                if (index < headers.length - 1) {
                    doc.line(xPos, yPos - 4, xPos, yPos + 2); // Vertical lines between headers
                }
            });

            // Add table content with borders
            yPos += 5;
            let total = 0;
            const rowHeight = 5; // Reduced row height
            const maxYPos = 115; // Maximum Y position before new page
            
            // Set smaller font size for table content
            doc.setFontSize(8);
            
            // Function to draw table headers
            function drawTableHeader() {
                doc.rect(startX, yPos - 4, tableWidth, 6);
                let headerXPos = startX;
                headers.forEach((header, index) => {
                    doc.text(header, headerXPos + 2, yPos, { align: 'left' });
                    headerXPos += columnWidths[index];
                    if (index < headers.length - 1) {
                        doc.line(headerXPos, yPos - 4, headerXPos, yPos + 2);
                    }
                });
                yPos += 5;
            }

            transactions.forEach((transaction, index) => {
                // Check if we need a new page
                if (yPos > maxYPos) {
                    doc.addPage();
                    yPos = 20;
                    drawTableHeader();
                }

                xPos = startX;
                // Draw row borders
                doc.rect(startX, yPos - 3, tableWidth, rowHeight);
                
                // Draw content with proper alignment
                doc.text(transaction.quantity.toString(), xPos + 2, yPos, { align: 'left' });
                xPos += columnWidths[0];
                doc.line(xPos, yPos - 3, xPos, yPos + 3); // Vertical line
                
                // Truncate product name if too long
                let productName = transaction.product;
                if (productName.length > 25) {
                    productName = productName.substring(0, 22) + '...';
                }
                doc.text(productName, xPos + 2, yPos, { align: 'left' });
                xPos += columnWidths[1];
                doc.line(xPos, yPos - 3, xPos, yPos + 3); // Vertical line
                
                const price = parseFloat(transaction.price);
                doc.text(price.toLocaleString('id-ID'), xPos + columnWidths[2] - 2, yPos, { align: 'right' });
                xPos += columnWidths[2];
                doc.line(xPos, yPos - 3, xPos, yPos + 3); // Vertical line
                
                const subtotal = price * transaction.quantity;
                doc.text(subtotal.toLocaleString('id-ID'), xPos + columnWidths[3] - 2, yPos, { align: 'right' });
                total += subtotal;
                yPos += rowHeight;
            });

            // Add total with border
            yPos += 2;
            doc.setFont('helvetica', 'bold');
            doc.rect(startX + tableWidth - 50, yPos - 3, 50, rowHeight);
            doc.text('Jumlah Rp.', startX + tableWidth - 48, yPos);
            doc.text(total.toLocaleString('id-ID'), startX + tableWidth - 2, yPos, { align: 'right' });
            doc.setFont('helvetica', 'normal');


            // Add signature lines
            yPos += 10;
            doc.text('Tanda Terima,', 10, yPos);
            doc.text('Hormat Kami,', 120, yPos);

            // Save the PDF
            doc.save(`nota_${dateStr}.pdf`);
            hideExportPopup();
        } catch (error) {
            console.error('Error generating nota:', error);
            alert('Error generating nota: ' + error.message);
        }
    });

function downloadCSV(data, filename) {
    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateCSV(data) {
    const rows = [];
    
    // Add customer information if available
    if (data.customer) {
        rows.push(['Customer Information']);
        rows.push(['Customer Name', 'Phone', 'Export Date']);
        rows.push([data.customer.name, data.customer.phone || 'N/A', new Date().toLocaleDateString('en-GB')]);
        rows.push([]); // Empty row for spacing
    }

    // Add headers and data based on export type
    if (data.customer) {
        // If customer info is included, keep the transaction information header
        rows.push(['Transaction Information']);
        rows.push(['Product', 'Price', 'Quantity', 'Total']);
    } else {
        // For simple export, only include column headers
        rows.push(['Product', 'Price', 'Quantity', 'Total']);
    }

    // Add transaction data
    data.transactions.forEach(t => {
        rows.push([t.product, t.price, t.quantity, (t.quantity * t.price)]);
    });

    // Convert to CSV format with proper escaping
    return rows.map(row => 
        row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        }).join(',')
    ).join('\n');
}

let selectedProduct = null;

function showQuantityPopup(product) {
    selectedProduct = product;
    document.getElementById('quantityPopup').style.display = 'block';
    document.getElementById('quantityPopupOverlay').style.display = 'block';
    document.getElementById('productQuantity').value = '1';
    document.getElementById('productQuantity').focus();
}

function hideQuantityPopup() {
    document.getElementById('quantityPopup').style.display = 'none';
    document.getElementById('quantityPopupOverlay').style.display = 'none';
    selectedProduct = null;
}

document.getElementById('cancelQuantity').addEventListener('click', hideQuantityPopup);
document.getElementById('quantityPopupOverlay').addEventListener('click', hideQuantityPopup);

document.getElementById('confirmQuantity').addEventListener('click', () => {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Please login to add transactions');
        return;
    }

    const quantity = parseInt(document.getElementById('productQuantity').value);
    const priceType = document.querySelector('input[name="priceType"]:checked').value;
    if (quantity > 0 && selectedProduct) {
        const price = priceType === 'selling' ? (selectedProduct.sellingPrice || selectedProduct.price) : selectedProduct.price;
        const transaction = {
            date: new Date().toISOString(),
            product: selectedProduct.name,
            quantity: quantity,
            price: price,
            total: quantity * price
        };
        
        const selectedSection = document.querySelector('input[name="transactionSection"]:checked').value;
        const dbPath = selectedSection === 'section1' ? 'transactions' : 'transactions2';
        const transactionRef = firebase.database().ref(`todos/${user.uid}/${dbPath}`);
        
        transactionRef.push(transaction)
            .then(() => {
                hideQuantityPopup();
                updateTransactionTable();
                updateTransactionTable2();
            })
            .catch(error => {
                console.error('Error adding transaction:', error);
                alert('Error adding transaction: ' + error.message);
            });
    }
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
                <td>${product.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${product.sellingPrice.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${(product.sellingPrice - product.price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</td>
                <td>${product.unit}</td>
                <td>${product.category}</td>
                <td>${product.sku}</td>
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
                    this.form.style.display = 'block';
                    this.todosContainer.style.display = 'grid';
                    document.querySelector('.navbar').style.display = 'flex';
    
                    this.loadTodos(); // Load todos only for the logged-in user
                } else {
                    this.authForms.style.display = 'block';
                    this.userInfo.style.display = 'none';
                    this.form.style.display = 'none';
                    this.todosContainer.style.display = 'none';
                    document.querySelector('.navbar').style.display = 'none';
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
                const todoNavBtn = document.getElementById('todoNavBtn');
                const productNavBtn = document.getElementById('productNavBtn');
                const transactionNavBtn = document.getElementById('transactionNavBtn');
                const settingsNavBtn = document.getElementById('settingsNavBtn');

                const todoSection = document.getElementById('todosContainer');
                const productSection = document.querySelector('.product-section');
                const transactionSection = document.getElementById('transactionSection');
                const transactionSection2 = document.getElementById('transactionSection2');
                const settingsSection = document.getElementById('settingsSection');

                const sections = [todoSection, productSection, transactionSection, transactionSection2, settingsSection];
                const navButtons = [todoNavBtn, productNavBtn, transactionNavBtn, settingsNavBtn];

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
    
        // Initialize the app
        const app = new TodoApp();
    // Settings functionality
    const settingsSection = document.getElementById('settingsSection');
    const businessSettingsForm = document.getElementById('businessSettingsForm');
    const settingsNavBtn = document.getElementById('settingsNavBtn');

    // Navigation handling for settings
    settingsNavBtn.addEventListener('click', async () => {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        settingsNavBtn.classList.add('active');
        
        // Hide other sections
        document.getElementById('todoForm').style.display = 'none';
        document.getElementById('todosContainer').style.display = 'none';
        document.getElementById('productSection').style.display = 'none';
        
        // Show settings section
        settingsSection.style.display = 'block';

        // Load customers and settings from Firebase
        const user = firebase.auth().currentUser;
        loadCustomers(); // Load customer list when settings section is shown
        if (user) {
            const settingsSnapshot = await firebase.database().ref(`todos/${user.uid}/settings`).once('value');
            const settings = settingsSnapshot.val() || {};
            
            // Update form fields with saved settings
            document.getElementById('companyName').value = settings.companyName || '';
            document.getElementById('businessAddress').value = settings.businessAddress || '';
            document.getElementById('bussinessLogo').value = settings.businessLogo || '';
            document.getElementById('businessEmail').value = settings.businessEmail || '';

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
            document.getElementById('companyName').value = settings.companyName || '';
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
            companyName: document.getElementById('companyName').value.trim(),
            businessAddress: document.getElementById('businessAddress').value.trim(),
            businessLogo: document.getElementById('bussinessLogo').value.trim(),
            businessEmail: document.getElementById('businessEmail').value.trim(),
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
            document.getElementById('companyName').value = settings.companyName || '';
            document.getElementById('businessAddress').value = settings.businessAddress || '';
            document.getElementById('bussinessLogo').value = settings.businessLogo || '';
            document.getElementById('businessEmail').value = settings.businessEmail || '';
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