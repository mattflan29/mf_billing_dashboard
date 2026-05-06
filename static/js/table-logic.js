// table logic
let workspaceGridApi;
const utilitiesCellFormatting = (params) => {
    const map = {
        0: 'F',
        1: '',
        2: 'NB',
        3: "Summ",
        4: "Vac",
        5: "CB",
        6: "B/NV",
        7: "DNB"
    };
    return map[params.value] !== undefined ? map[params.value] : "-";
};
const utilityClassRules = {
    'utility-false': params => params.value === 0,
    'utility-true': params => params.value === 1,
    'utility-nb': params => params.value === 2,
    'utility-summ': params => params.value === 3,
    'utility-vac': params => params.value === 4,
    'utility-cb': params => params.value === 5,
    'utility-bnv': params => params.value === 6,
    'utility-dnb': params => params.value === 7
};
const workspaceColumnData = [
    { field: "resident_id", headerName: "Resident ID", hide: true },
    { field: "bc_assignee", headerName: "BC", filter: true, sortable: true, width: 150  },
    { field: "home_code", headerName: "Prop Code", filter: true, sortable: true, width: 150  },
    { field: "market", headerName: "Market", filter: true, sortable: true },
    { field: "resident_code", headerName: "Resident Code", filter: true, sortable: true, width: 150 },
    { field: "move_in", headerName: "Move-In Date", 
        valueFormatter: params => {
            if (!params.value || params.value === '-') return '-';
            const d = new Date(params.value);
            if (isNaN(d)) return '-';
            return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        },
        comparator: (valueA, valueB) => {
            const dateA = valueA && valueA !== '-' ? new Date(valueA).getTime() : 0;
            const dateB = valueB && valueB !== '-' ? new Date(valueB).getTime() : 0;
            return dateA - dateB;
        }, filter: true, sortable: true, width: 150 },
    { field: "renewal", headerName: "Renewal Date", 
        valueFormatter: params => {
            if (!params.value || params.value === '-') return '-';
            const d = new Date(params.value);
            if (isNaN(d)) return '-';
            return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
        },
        comparator: (valueA, valueB) => {
            const dateA = valueA && valueA !== '-' ? new Date(valueA).getTime() : 0;
            const dateB = valueB && valueB !== '-' ? new Date(valueB).getTime() : 0;
            return dateA - dateB;
        }, filter: true, sortable: true, width: 150 },
    { field: "lease_id", headerName: "Lease ID", filter: true, sortable: true, width: 125 },
    { field: "admin_notes", headerName:"Admin Notes", 
        filter: true, sortable: true, cellStyle: { whiteSpace: 'pre-wrap'}, autoHeight: true },
    { field: "quick_note", headerName: "Quick Note", 
        filter: true, sortable: true, cellStyle: { whiteSpace: 'pre-wrap'}, autoHeight: true },
    { field: "billing_note", headerName: "Billing Note", 
        filter: true, sortable: true, cellStyle: { whiteSpace: 'pre-wrap'}, autoHeight: true },
    { field: "status", headerName: "Status", filter: true, sortable: true },
    { field: "water", headerName: "W", headerClass: "utility-header water", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "irrigation", headerName: "Irr", headerClass: "utility-header water", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "sewer", headerName: "S", headerClass: "utility-header sewer", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "trash", headerName: "T", headerClass: "utility-header trash", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "electric", headerName: "E", headerClass: "utility-header electric", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "gas", headerName: "G", headerClass: "utility-header gas", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "stormwater", headerName: "SW", headerClass: "utility-header sw", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "trash5", headerName: "T5", headerClass: "utility-header trash", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "base_basic", headerName: "B", headerClass: "utility-header base", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "water2", headerName: "W2", headerClass: "utility-header water", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "sewer2", headerName: "S2", headerClass: "utility-header sewer", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "electric2", headerName: "E2", headerClass: "utility-header electric", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
    { field: "gas2_propane", headerName: "G2", headerClass: "utility-header gas", valueFormatter: utilitiesCellFormatting, filter: true, sortable: true, cellClassRules: utilityClassRules, width: 80 },
];
const workspaceGridOptions = {
    columnDefs: workspaceColumnData,
    rowData: [],
    rowSelection: {
        mode: 'multiRow',
        headerCheckbox: true,
        checkboxes: true,
        enableClickSelection: false
    },
    autoSizeStrategy: {
        type: 'fitGridWidth'
    },
    suppressVerticalScroll: true,
    pagination: true,
    paginationPageSize: 10000,
    paginationPageSizeSelector: [1000, 2000, 5000, 10000],

    onFirstDataRendered: params => {
        params.api.sizeColumnsToFit();
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#workspaceGrid');
    workspaceGridApi = agGrid.createGrid(gridDiv, workspaceGridOptions);

    refreshGridData();
});
const progressReportColumnData = [
    { field: "management_co", headerName: "Management Co", filter: true, sortable: true },
    { field: "state", headerName: "State", filter: true, sortable: true, width: 150  },
    { field: "new", headerName: "New", filter: true, sortable: true, width: 150  },
    { field: "approved", headerName: "Approved", filter: true, sortable: true, width: 150  },
    { field: "qc_complete", headerName: "QC Complete", filter: true, sortable: true, width: 150  },
    { field: "mailed", headerName: "Mailed", filter: true, sortable: true, width: 150  }

];
const progressReportGridOptions = {
    columnDefs: progressReportColumnData,
    rowData: [],
    autoSizeStrategy: {
        type: 'fitGridWidth'
    },
    rowHeight: 25,
    //groupDefaultExpanded: 1,
    //suppressAggFuncInHeader: true,
};
let progressGridApi;
document.addEventListener('DOMContentLoaded', () => {
    const gridDiv = document.querySelector('#progressReportGrid');
    progressGridApi = agGrid.createGrid(gridDiv, progressReportGridOptions);

    fetch('/api/progress_report')
        .then(res => res.json())
        .then(data => {
            progressGridApi.setGridOption('rowData', data);
        });
});
function onBtnExportCSV() {
    workspaceGridApi.exportDataAsCsv();
}
// end table logic
const formatGridDate = (dateVal) => {
    if (!dateVal || dateVal === "-") return "-";
    
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";

    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    
    return `${mm}/${dd}/${yyyy}`;
};
function refreshGridData(e) {
    if (e) e.preventDefault();

    const market = document.getElementById('market_filter').value;
    const mgmt = document.getElementById('mgmt_filter').value;
    const state = document.getElementById('state_filter').value;
    const search = document.getElementById('global-search').value;

    const url = `/api/monthly_records?mgmt=${mgmt}&state=${state}&market=${market}&q=${search}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            console.log("Data received:", data);
            workspaceGridApi.setGridOption('rowData', data);
        })
        .catch(err => console.error("Fetch error:", err));
}
async function submitBatchUpdate() {
    const selectedRows = workspaceGridApi.getSelectedRows();
    const resIds = selectedRows.map(row => row.resident_id);
    
    if (resIds.length === 0) {
        alert("No records selected");
        return;
    }
    
    const payload = {
        res_id: resIds,
        billed_by: document.getElementById('update-billed-by').value,
        action_note: document.getElementById('update-action-note').value,
        billing_note: document.getElementById('update-billing-note').value,
        append_billing_note: document.getElementById('append-billing-note-checkbox').checked,
        quick_note: document.getElementById('update-quick-note').value,
        append_quick_note: document.getElementById('append-quick-note-checkbox').checked,
        status: document.getElementById('update-status').value
    };

    try {
        const response = await fetch('/workspace/update_monthly_data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Updated successfully");
            containerOff();
            refreshGridData();
        } else {
            alert("Error updating");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
window.submitBatchUpdate = submitBatchUpdate;
function copySelectedToClipboard(btn) {
    const selectedRows = workspaceGridApi.getSelectedRows();

    if (selectedRows.length === 0) {
        alert("No items selected");
        return;
    }

    const propCodeList = selectedRows
        .map(row => row.home_code)
        .filter(code => code);

    const finalString = propCodeList.join('\n');

    navigator.clipboard.writeText(finalString).then(() => {
        showSuccess(btn);
    }).catch(err => {
        fallbackCopyTextToClipboard(finalString, btn);
    });
}
function debouncedSearch(val) {
    if (workspaceGridApi) {
        workspaceGridApi.setGridOption('quickFilterText', val);
    }
}
// not sure if this is needed yet
function openSidePanel(id) {
    console.log("Opening panel for resident:", id);
}
function showSuccess(btn) {
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = originalText; }, 2000);
}

//menu bar
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
}
function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
}
const dropdown = document.getElementsByClassName("dropdown-btn");

for (let i = 0; i < dropdown.length; i++) {
    dropdown[i].addEventListener("click", function() {
        this.classList.toggle("active");
        const dropdownContent = this.nextElementSibling;
        dropdownContent.style.display = (dropdownContent.style.display === "block") ? "none" : "block";
    });
}

window.addEventListener('click', function(e) {
    const sidebar = document.getElementById("mySidebar");
    const openBtn = document.querySelector(".openbtn");

  if (!sidebar.contains(e.target) && !openBtn.contains(e.target)) {
    if (sidebar.style.width === "250px") {
      closeNav();
    }
  }
});
//end menu bar

function leaseRulesOn() {
    const leases = {};
    workspaceGridApi.forEachNode((node) => {
        const data = node.data;
        const leaseid = data.lease_id;

        if (leaseid && leaseid !== '-' && !leases[leaseid]) {
            leases[leaseid] = {
                leaseid: leaseid,
                states: data.lease_states,
                intro: formatGridDate(data.lease_intro),
                retirement: formatGridDate(data.lease_retirement),
                renewal: formatGridDate(data.lease_renewal),
                requiredUtilities: data.lease_required_utilities,
                switchableUtilities: data.lease_switchable_utilities,
                vacantUtilities: data.lease_vacant_utilities,
                serviceFee: data.lease_service_fee,
                renewalFee: data.lease_renewal_fee,
                setupFee: data.lease_setup_fee,
                moveOutFee: data.lease_move_out_fee,
                vsf: data.lease_vsf,
                otherFees: data.lease_other_fees,
                notes: data.lease_notes,
                gracePeriod: data.lease_grace_period
            };
        }
    });

     const tabContainer = document.getElementById('lease-tabs-container');
    tabContainer.innerHTML = '';

    Object.keys(leases).sort().forEach(leaseid => {
        const btn = document.createElement('button');
        btn.innerText= leaseid;
        btn.style = "padding: 5px 10px; cursor:pointer; border:1px solid #007bff; background: white; border-radius: 4px;";
        btn.onclick = () => showLeaseDetails(leaseid, leases[leaseid]);
        tabContainer.appendChild(btn);
    });

    document.getElementById("lease-rules-expand").style.display = "block";
    document.getElementById("close-box-window").style.display = "block";
    document.getElementById("form-overlay").style.display = "none";
    document.getElementById("market-rules-expand").style.display = "none";

    closeLibraryButtons();
}
function showLeaseDetails (leaseid, data) {
    const content = document.getElementById('lease-display-content');
    content.innerHTML = `
        <h2>Lease ID: ${leaseid}</h2>
        <p><strong>Intro:</strong> ${data.intro || '-'}</p>
        <p><strong>Renewal:</strong> ${data.renewal || '-'}</p>
        <p><strong>Retirement:</strong> ${data.retirement || '-'}</p>
        <p><strong>Grace Period:</strong> ${data.gracePeriod || '-'}</p>
        <p><strong>States:</strong> ${data.states || '-'}</p>
        <p><strong>Switchable U.:</strong> ${data.switchableUtilities || '-'}</p>
        <p><strong>Required U.:</strong> ${data.requiredUtilities || '-'}</p>
        <p><strong>Vacant U.:</strong> ${data.vacantUtilities || '-'}</p>
        <p><strong>Lease Notes:</strong> ${data.notes || '-'}</p>
        <p><strong>Service Fee:</strong> $${data.serviceFee || '-'}</p>
        <p><strong>Renewal Fee:</strong> $${data.renewalFee || '-'}</p>
        <p><strong>Setup Fee:</strong> $${data.setupFee || '-'}</p>
        <p><strong>VSF:</strong> $${data.vsf || '-'}</p>
        <p><strong>Move Out Fee:</strong> $${data.moveOutFee || '-'}</p>
        <p><strong>Other Fees:</strong> $${data.otherFees || '-'}</p>
    `;
    closeLibraryButtons();
}
function formSubmissionOn() {
    document.getElementById("form-overlay").style.display = "block";
    document.getElementById("market-rules-expand").style.display = "none";
    document.getElementById("lease-rules-expand").style.display = "none";
    closeLibraryButtons();
}
function marketRulesOn() {
    const markets = {};
    workspaceGridApi.forEachNode((node) => {
        const data = node.data;
        const marketName = data.market;

        if (marketName && marketName !== '-' && !markets[marketName]) {
            markets[marketName] = {
                name: marketName,
                rules: data.market_rules || '-'
            };
        }
    });

    const tabContainer = document.getElementById('market-tabs-container');
    tabContainer.innerHTML = '';
    
    Object.keys(markets).sort().forEach(market => {
        const btn = document.createElement('button');
        btn.innerText = market;
        btn.className = "inner-library-button";
        btn.style = "padding: 5px 10px; cursor:pointer; border:1px solid #007bff; background: white; border-radius: 4px;";
        btn.onclick = () => showMarketDetails(market, markets[market]);
        tabContainer.appendChild(btn);
    });
    
    document.getElementById("market-rules-expand").style.display = "block";
    document.getElementById("close-box-window").style.display = "block";
    document.getElementById("form-overlay").style.display = "none";
    document.getElementById("lease-rules-expand").style.display = "none";
    closeLibraryButtons();
}
function showMarketDetails (market, data) {
    const content = document.getElementById('market-display-content');
    content.innerHTML = `
        <h3>${market}</h3>
        <p style="white-space: pre-line;"><strong>Rules:<br></strong> ${data.rules || '-'}</p>
    `;
}
function containerOff() {
    document.getElementById("form-overlay").style.display = "none";
    document.getElementById("market-rules-expand").style.display = "none";
    document.getElementById("lease-rules-expand").style.display = "none";
    document.getElementById("close-box-window").style.display = "none";
    closeLibraryButtons();
}
function showLibraryButtons() {
    document.getElementById("leaseRulesBtn").style.display = "block";
    document.getElementById("marketRulesBtn").style.display = "block";
    document.getElementById("formSubmissionBtn").style.display = "block";
    document.getElementById("close-library-buttons").style.display = "block";
    document.getElementById("libraryBtnClose").style.display = "block";
}
function closeLibraryButtons() {
    document.getElementById("leaseRulesBtn").style.display = "none";
    document.getElementById("marketRulesBtn").style.display = "none";
    document.getElementById("formSubmissionBtn").style.display = "none";
    document.getElementById("close-library-buttons").style.display = "none";
    document.getElementById("libraryBtnClose").style.display = "none";

}

//maybe unnecessary
    //select all checkbox logic
function toggleAll(masterCheckbox) {
        const checkboxes = document.querySelectorAll('.record-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = masterCheckbox.checked;
        });
    }

function handleShiftClick(e) {
    let inBetween = false;
    if (e.shiftKey && lastChecked && lastChecked !== this) {
        const checkboxes = Array.from(document.querySelectorAll('.record-checkbox'));
        checkboxes.forEach(cb => {
            if (cb === this || cb === lastChecked) {
                inBetween = !inBetween;
            }
            if (inBetween) {
                cb.checked = this.checked;
            }
        });
    }
    lastChecked = this;
}

function clearSearch() {
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.set('page', 1);
    window.location.href = url.href;
}
