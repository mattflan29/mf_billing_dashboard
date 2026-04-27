let lastChecked;


//select all checkbox logic
function toggleAll(masterCheckbox) {
            const checkboxes = document.querySelectorAll('.record-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = masterCheckbox.checked;
            });
        }
//shift click logic
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


function getSelectedIDs() {
    const selected = document.querySelectorAll('.record-checkbox:checked');
    const ids = Array.from(selected).map(cb => cb.value);
    console.log("Selected IDs:", ids);
    return ids;
}
//copy prop codes to clipboard logic
function copySelectedToClipboard(btn) {
    const selectedCheckboxes = document.querySelectorAll('.record-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
        alert("No prop codes selected");
        return;
    }

    const headers = Array.from(document.querySelectorAll('table thead th'));
    const propCodeIndex = headers.findIndex(th => {
        const text = th.textContent.trim().toLowerCase()
        return text.includes('prop') && text.includes('code');
    });

    if (propCodeIndex === -1) {
        alert("Prop Code column not found");
        return;
    }

    let propCodeList = [];
    selectedCheckboxes.forEach(cb => {
        const row = cb.closest('tr');
        const cells = row.querySelectorAll('td');
        const propCode = cells[propCodeIndex].innerText.trim();
        if (propCode) propCodeList.push(propCode);
    });

    const finalString = propCodeList.join('\n');

    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(finalString, btn);
        return;
    }

    navigator.clipboard.writeText(finalString).then(() => {
        showSuccess(btn);
    }).catch(err => {
        console.warn('Clipboard API failed, falling back to textarea method', err);
        fallbackCopyTextToClipboard(finalString, btn);
    })
}
// helper button to show clipboard copy success
function showSuccess(btn) {
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
}
//fallback method for clipboard copy for older browsers
function fallbackCopyTextToClipboard(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showSuccess(btn);
        } else {
            alert("Failed to copy to clipboard");
        }
    } catch (err) {
        alert('Fallback copy failed: ', err);
    }
    document.body.removeChild(textarea);
}
//runs on page load to initialize checkbox event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.record-checkbox').forEach(cb => {
        cb.addEventListener('click', handleShiftClick);
    });
});

let searchTimer;
function debouncedSearch(val) {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('q', val);
        url.searchParams.set('page', 1);
        window.location.href = url.href;
    }, 500);
}
function clearSearch() {
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.set('page', 1);
    window.location.href = url.href;
}
document.getElementById('global-search').addEventListener('keydown', function(e) {
    if (e.key === "Escape") {
        clearSearch();
    }
});
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

function toggleRowDetails(rowId, leaseId) {
    const row = document.getElementById(rowId);
    const container = row.querySelection('.expansion-content');

    if (row.style.display === "none") {
        if (container.innerHTML.trim() === "") {
            container.innerHTML = "Loading...";
            fetch(`/get_lease_details/${leaseId}`)
                .then(response => response.text())
                .then(html => { container.innerHTML = html; });
        }
        row.style.display = "table-row";
    } else {
        row.style.display = "none";
    }
}
$(document).ready(function() {
    var table = $('#data-table').DataTable({
        destroy: true,
        fixedHeader: true,
        pageLength: 1000, 
        order: [[ 3, 'asc' ]],
        autoWidth: false, 
        columnDefs: [{ orderable: false, targets: [0] }]
    });
});

function leaseRulesOn() {
    const leases = {};
    document.querySelectorAll('.main-row').forEach(row => {
        const leaseid = row.getAttribute('data-lease-id');
        if (leaseid && leaseid !== '-' && !leases[leaseid]) {
            leases[leaseid] = {
                states: row.getAttribute('data-lease-states'),
                intro: row.getAttribute('data-lease-intro'),
                retirement: row.getAttribute('data-lease-retirement'),
                renewal: row.getAttribute('data-lease-renewal'),
                requiredUtilities: row.getAttribute('data-lease-required-utilities'),
                switchableUtilities: row.getAttribute('data-lease-switchable-utilities'),
                vacantUtilities: row.getAttribute('data-lease-vacant-utilities'),
                serviceFee: row.getAttribute('data-lease-service-fee'),
                renewalFee: row.getAttribute('data-lease-renewal-fee'),
                setupFee: row.getAttribute('data-lease-setup-fee'),
                moveOutFee: row.getAttribute('data-lease-move-out-fee'),
                vsf: row.getAttribute('data-lease-vsf'),
                otherFees: row.getAttribute('data-lease-other-fees'),
                notes: row.getAttribute('data-lease-notes'),
                gracePeriod: row.getAttribute('data-lease-grace-period')
            };
        }
    });

    const tabContainer = document.getElementById('lease-tabs-container');
    tabContainer.innerHTML = '';

    Object.keys(leases).forEach(leaseid => {
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
}

function showLeaseDetails (leaseid, data) {
    const content = document.getElementById('lease-display-content');
    content.innerHTML = `
        <h3>Lease ID: ${leaseid}</h3>
        <p><strong>Intro:</strong> ${data.intro || '-'}</p>
        <p><strong>Renewal:</strong> ${data.renewal || '-'}</p>
        <p><strong>Retirement:</strong> ${data.retirement || '-'}</p>
        <p><strong>Grace Period:</strong> ${data.gracePeriod || '-'}</p>
        <p><strong>States:</strong> ${data.states || '-'}</p>
        <p><strong>Switchable U.:</strong> ${data.switchableUtilities || '-'}</p>
        <p><strong>Required U.:</strong> ${data.requiredUtilities || '-'}</p>
        <p><strong>Vacant U.:</strong> ${data.vacantUtilities || '-'}</p>
        <p><strong>Lease Notes:</strong> ${data.notes || '-'}</p>
        <p><strong>Service Fee:</strong> ${data.serviceFee || '-'}</p>
        <p><strong>Renewal Fee:</strong> ${data.renewalFee || '-'}</p>
        <p><strong>Setup Fee:</strong> ${data.setupFee || '-'}</p>
        <p><strong>VSF:</strong> ${data.vsf || '-'}</p>
        <p><strong>Move Out Fee:</strong> ${data.moveOutFee || '-'}</p>
        <p><strong>Other Fees:</strong> ${data.otherFees || '-'}</p>
    `;
}

function formSubmissionOn() {
    document.getElementById("form-overlay").style.display = "block";
    document.getElementById("market-rules-expand").style.display = "none";
    document.getElementById("lease-rules-expand").style.display = "none";
}
function containerOff() {
    document.getElementById("form-overlay").style.display = "none";
    document.getElementById("market-rules-expand").style.display = "none"
    document.getElementById("lease-rules-expand").style.display = "none";
    document.getElementById("close-box-window").style.display = "none";
}
function marketRulesOn() {
    const markets = {};
    document.querySelectorAll('.main-row').forEach(row => {
        const market = row.getAttribute('data-market-name');
        if (market && market !== 'nope' && !markets[market]) {
            markets[market] = {
                name: row.getAttribute('data-market-name'),
                rules: row.getAttribute('data-market-rules'),
            };
        }
    });

    const tabContainer = document.getElementById('market-tabs-container');
    tabContainer.innerHTML = '';

    Object.keys(markets).forEach(market => {
        const btn = document.createElement('button');
        btn.innerText= market;
        btn.style = "padding: 5px 10px; cursor:pointer; border:1px solid #007bff; background: white; border-radius: 4px;";
        btn.onclick = () => showMarketDetails(market, markets[market]);
        tabContainer.appendChild(btn);
    });
    
    document.getElementById("market-rules-expand").style.display = "block";
    document.getElementById("close-box-window").style.display = "block";
    document.getElementById("form-overlay").style.display = "none";
    document.getElementById("lease-rules-expand").style.display = "none";
}

function showMarketDetails (market, data) {
    const content = document.getElementById('market-display-content');
    content.innerHTML = `
        <h3>${market}</h3>
        <p><strong>Rules:</strong> ${data.rules || '-'}</p>
    `;
}

async function submitBatchUpdate() {
    const selectedCheckboxes = document.querySelectorAll('.record-checkbox:checked');
    const resId = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (resId.length === 0) {
        alert("No homes selected");
        return;
    }
    
    const payload = {
        res_id: resId,
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
            alert("Updated");
            location.reload() // not sure if i want the page to reload: 
        } else {
            alert("Error updating");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}