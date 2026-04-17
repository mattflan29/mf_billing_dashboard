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
        columnDefs: [{ orderable: false, targets: [0, 1] }]
    });

    function format(tr) {
          return `
            <div class="expansion-content">
                <table class="inner-grid" id="lease-info" style="display: inline-block;">
                    <caption style="font-size: 16px; text-align: left; padding-left: 12px;"><strong>Lease Info</strong></caption>
                    <tr>
                        <td id="date-column">
                            <p><strong>Intro:</strong> ${tr.data('lease-intro')}</p>
                            <p><strong>Renewal:</strong> ${tr.data('lease-renewal')}</p>
                            <p><strong>Retirement:</strong> ${tr.data('lease-retirement')}</p>
                            <p><strong>Grace Period:</strong> ${tr.data('lease-grace-period')}</p>
                            <p><strong>States:</strong> ${tr.data('lease-states')}</p>
                        </td>
                        <td id="utilities-column">
                            <p><strong>Switchable U.:</strong> ${tr.data('lease-switchable-utilities')}</p>
                            <p><strong>Required U.:</strong> ${tr.data('lease-required-utilities')}</p>
                            <p><strong>Vacant U.:</strong> ${tr.data('lease-vacant-utilities')}</p>
                            <p><strong>Lease Notes:</strong> ${tr.data('lease-notes')}</p>
                        </td>
                        <td id="fee-column">
                            <p><strong>Service Fee:</strong> ${tr.data('lease-service-fee')}</p>
                            <p><strong>Renewal Fee:</strong> ${tr.data('lease-renewal-fee')}</p>
                            <p><strong>Setup Fee:</strong> ${tr.data('lease-setup-fee')}</p>
                            <p><strong>VSF:</strong> ${tr.data('lease-vsf')}</p>
                            <p><strong>Move Out Fee:</strong> ${tr.data('lease-move-out-fee')}</p>
                            <p><strong>Other Fees:</strong> ${tr.data('lease-other-fees')}</p>
                        </td>
                    </tr>
                </table>
                <table class="inner-grid" id="market-rules" style="display: inline-block;">
                    <caption style="font-size: 16px; text-align: left; padding-left: 12px;"><strong>Market Rules
                        <span style="float: right;">${tr.data('market-name')}</span></strong></caption>
                    <tr>
                        <td>
                            <p style="white-space: pre-line">${tr.data('market-rules')}</p>
                        <td>
                    </tr>
                </table>
            </div>`;
    }

    $('#data-table tbody').on('click', 'tr.main-row', function (e) {
        if ($(e.target).is('input[type="checkbox"]') || $(e.target).is('a') || $(e.target).is('button')) {
            return;
        }
        var tr = $(this);
        var row = table.row(tr);

        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass('shown');
            tr.find('.details-control').html('+');
        } else {
            table.rows().every(function() {
                if (this.child.isShown()) {
                    this.child.hide();
                    $(this.node()).removeClass('shown');
                    $(this.node()).find('.details-control').html('+');
                }
            });
            row.child(format(tr)).show();
            tr.addClass('shown');
            tr.find('.details-control').html('-');
        }
    });
});