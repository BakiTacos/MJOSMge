let currentExportSection = 'transactions';

function showExportPopup(section = 'transactions') {
    currentExportSection = section;
    const exportPopup = document.getElementById('exportPopup');
    const overlay = document.getElementById('quantityPopupOverlay');
    const customerSelect = document.getElementById('customerSelect');

    // Clear previous options
    customerSelect.innerHTML = '<option value="">Select a customer...</option>';

    // Fetch customers from Firebase
    firebase.database().ref('customers').once('value')
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
        // Fetch customer details
        const customerSnapshot = await firebase.database().ref('customers').child(customerId).once('value');
        const customer = customerSnapshot.val();

        // Fetch transactions from the correct section
        const transactionSnapshot = await firebase.database().ref(currentExportSection).once('value');
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
        alert('Error exporting data');
    }
});

document.getElementById('confirmExportSimple').addEventListener('click', async () => {
    try {
        // Fetch transactions only from the correct section
        const transactionSnapshot = await firebase.database().ref(currentExportSection).once('value');
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
    let businessName = 'Business Name';
    let businessAddress = '';
    let businessPhone = '';
    if (user) {
        const settingsSnapshot = await firebase.database().ref(`users/${user.uid}/settings`).once('value');
        const settings = settingsSnapshot.val() || {};
        businessName = settings.companyName || 'Business Name';
        businessAddress = settings.address || '';
        businessPhone = settings.phone || '';
    }

    // Header section
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 20, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(businessAddress, 20, 27);
    doc.text(businessPhone, 20, 34);

    // Invoice title and number
    const invoiceNumber = `INV-${Date.now()}`;
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
    if (customerId) {
        const customerRef = firebase.database().ref('customers/' + customerId);
        const snapshot = await customerRef.once('value');
        const customer = snapshot.val();
        doc.text(customer.name, 20, customerYPosition);
        if (customer.address) {
            customerYPosition += 7;
            doc.text(customer.address, 20, customerYPosition);
        }
        if (customer.phone) {
            customerYPosition += 7;
            doc.text(`Telp: ${customer.phone}`, 20, customerYPosition);
        }
    }

    // Transaction table
    const transactionRef = firebase.database().ref(currentExportSection);
    const transactionSnapshot = await transactionRef.once('value');
    const transactions = [];
    transactionSnapshot.forEach(childSnapshot => {
        transactions.push(childSnapshot.val());
    });
    
    const tableData = transactions.map(transaction => [
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
    const subtotal = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const tax = subtotal * 0.11; // 11% tax
    const total = subtotal + tax;
    
    // Add totals section
    const finalY = doc.previousAutoTable.finalY + 5;
    doc.setFontSize(10);
    
    doc.text('Sub Total:', pageWidth - 90, finalY + 7);
    doc.text(subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, finalY + 7, { align: 'right' });
    
    doc.text('PPN 11%:', pageWidth - 90, finalY + 14);
    doc.text(tax.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, finalY + 14, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', pageWidth - 90, finalY + 21);
    doc.text(total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }), pageWidth - 20, finalY + 21, { align: 'right' });
    
    // Add signature section
    const signatureY = finalY + 40;
    doc.setFont('helvetica', 'normal');
    doc.text('Hormat Kami,', 20, signatureY);
    doc.line(20, signatureY + 25, 70, signatureY + 25);
    doc.text(businessName, 20, signatureY + 32);
    
    // Save the PDF
    doc.save(`invoice-${invoiceNumber}.pdf`);
    
    // Close the popup
    document.getElementById('exportPopup').style.display = 'none';
    document.querySelector('.product-popup-overlay').style.display = 'none';
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