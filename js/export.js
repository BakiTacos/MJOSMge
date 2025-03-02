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
