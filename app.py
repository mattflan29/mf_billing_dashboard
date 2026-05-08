from flask import Flask, jsonify, request, render_template, redirect, url_for, flash, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
from sqlalchemy import func, extract, desc, text, case
from sqlalchemy.orm import joinedload, contains_eager
from dotenv import load_dotenv
import os, enum, pandas as pd, numpy as np, io, csv, re

load_dotenv()

DB_USER = os.getenv('DB_USER')
DB_PASS = os.getenv('DB_PASS')
DB_NAME = os.getenv('DB_NAME')
TEAM_LEAD_PASS = os.getenv('TEAM_LEAD_PASS')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASS}@127.0.0.1:3306/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

active_user = 112


def get_current_post_month():
    setting = SystemSettings.query.filter_by(setting_key='current_post_month').first()
    date_str = setting.setting_value if setting  else "2026-05-01"
    return datetime.strptime(date_str, '%Y-%m-%d').date()

@app.context_processor
def inject_post_month():
    return {'current_post_month': get_current_post_month()}

def apply_search(query, model, search_query):
    if not search_query:
        return query
    
    if not hasattr(model, 'prop_code'):
        return query
    
    code_list = re.split(r'[,\t\n]+', search_query.strip())
    code_list = [c.strip() for c in code_list if c.strip()]

    if len(code_list) > 1:
        return query.filter(model.prop_code.in_(code_list))
    if len(code_list) == 1:
        return query.filter(model.prop_code.ilike(f"%{code_list[0]}%"))
    return query

def clean_val(val):
    if pd.isna(val):
        return None
    return val

@app.route('/')
def home_page():
    return render_template('home.html',
                           title="Home")

@app.route('/workspace')
def workspace():
    current_month = get_current_post_month()
    current_user = "awhitehead@conservice.com"

    billed_by_options = db.session.query(TeamRegister.employee_id, TeamRegister.nickname).filter(TeamRegister.role.in_(['Billing Coordinator'])).all()

    filtered_data = db.session.query(
        Home.market, Home.state, ManagementCompanies.id, ManagementCompanies.mgmt_co, MonthlyData.status)\
        .join(TeamRegister, Home.bc_assignee == TeamRegister.employee_id)\
        .join(ManagementCompanies, Home.mgmt_co_id == ManagementCompanies.id)\
        .join(Resident, Home.home_id == Resident.home_id)\
        .outerjoin(MonthlyData, (Resident.resident_id == MonthlyData.resident_id) & (MonthlyData.post_month == current_month))\
        .filter(TeamRegister.email == current_user, Home.residents != None).all()
    
    markets_set = set()
    states_set = set()
    mgmtco_dict = {}
    status_set = set()

    for market, state, co_id, co_name, status in filtered_data:
        if market: markets_set.add(market)
        if state: states_set.add(state)
        if co_id: mgmtco_dict[co_id] = co_name
        if status: status_set.add(status)

    states = sorted(list(states_set))
    markets = sorted(list(markets_set))
    status = sorted(list(status_set))
    companies = [{"id": co_id, "mgmt_co": co_name} for co_id, co_name in mgmtco_dict.items()]
    companies = sorted(companies, key=lambda x: x['mgmt_co'])

    return render_template('workspace.html',
                           title="Workspace", 
                           states=states,
                           markets=markets, 
                           companies=companies,
                           status=status,
                           bc_list=billed_by_options)

@app.route('/workspace/update_monthly_data', methods=['POST'])
def update_monthly_data():
    data = request.get_json()
    res_ids = data.get('res_id', [])
    current_month = get_current_post_month()

    for r_id in res_ids:
        monthly = MonthlyData.query.filter_by(resident_id=r_id, post_month=current_month).first()
        
        if not monthly:
            monthly = MonthlyData(resident_id=r_id, post_month=current_month)
            db.session.add(monthly)

        if monthly:
            if data.get('status'):
                monthly.status = data['status']

            if data.get('quick_note'):
                timestamp = datetime.now().strftime("%m/%d/%y %I:%M %p")
                new_quick_note_body = data['quick_note']
            
                formatted_quick_note = f"{timestamp} {new_quick_note_body}"

                if data.get('append_quick_note') is True:
                    existing_quick_note = monthly.quick_note if monthly.quick_note else ""
                    if existing_quick_note:
                        monthly.quick_note = f"{existing_quick_note}\n{formatted_quick_note}"
                    else:
                        monthly.quick_note = formatted_quick_note
                else:
                    monthly.quick_note = formatted_quick_note

            if data.get('billing_note'):
                timestamp = datetime.now().strftime("%m/%d/%y %I:%M %p")
                new_billing_note_body = data['billing_note']
            
                formatted_billing_note = f"{timestamp} {new_billing_note_body}"

                if data.get('append_billing_note') is True:
                    existing_billing_note = monthly.billing_note if monthly.billing_note else ""
                    if existing_billing_note:
                        monthly.billing_note = f"{existing_billing_note}\n{formatted_billing_note}"
                    else:
                        monthly.billing_note = formatted_billing_note
                else:
                    monthly.billing_note = formatted_billing_note

            billed_val = data.get('billed_by')
            if billed_val == "unassigned":
                monthly.billed_by = 123456
            if billed_val and billed_val != "none":
                if str(billed_val).isdigit():
                    monthly.billed_by = int(billed_val)
            if monthly.status == 'Approved' and monthly.status.startswith('Approved') and not monthly.billed_by:
                monthly.billed_by = active_user

            if data.get('action_note') in ['true', 'false']:
                monthly.action_note = (data['action_note'] == 'true')

            utility_updates = data.get('utility_updates', {})
            for utility, value in utility_updates.items():
                if hasattr(monthly, utility):
                    setattr(monthly, utility, int(value))

    db.session.commit()
    return jsonify({"status": "success"}), 200
            
@app.route('/api/monthly_records')
def get_monthly_records():
    current_month = get_current_post_month()
    current_user = "awhitehead@conservice.com"
    market_val = request.args.get('market')
    mgmt_val = request.args.get('mgmt')
    state_val = request.args.get('state')
    status_val = request.args.get('status')


    query = Home.query.join(TeamRegister, Home.bc_assignee == TeamRegister.employee_id)\
        .join(Resident, Home.home_id == Resident.home_id)\
        .join(Leases, Resident.lease_id == Leases.lease_id)\
        .outerjoin(MonthlyData, (Resident.resident_id == MonthlyData.resident_id) & (MonthlyData.post_month == current_month))\
    .options(
        contains_eager(Home.residents).contains_eager(Resident.monthly_info),
        contains_eager(Home.residents).contains_eager(Resident.lease)
    )

    query = query.filter(TeamRegister.email == current_user)
    query = query.filter(Home.residents != None)

    if market_val and market_val != "":
        query = query.filter(Home.market == market_val)
    if mgmt_val and mgmt_val != "":
        query = query.filter(Home.mgmt_co_id == int(mgmt_val))
    if state_val and state_val != "":
        query = query.filter(Home.state == state_val)
    if status_val and status_val != "":
        query = query.filter(MonthlyData.status == status_val)


    homes = query.all()

    output = []
    for h in homes:
        res = h.residents[0] if h.residents else None
        m_info = next((m for m in res.monthly_info if m.post_month == current_month), None) if res else None
        l = res.lease if (res and res.lease) else None

        output.append({
            "bc_assignee": h.bc_user.nickname if h.bc_user else "Unassigned",
            "home_code": h.prop_code,
            "market": h.market or "-",
            "market_rules": h.mrkt_rls.market_rules if h.mrkt_rls else "-",
            "state": h.state,
            "status": m_info.status if m_info else "-",
            "quick_note": m_info.quick_note if m_info else "-",
            "billing_note": m_info.billing_note if m_info else "-",
            "water": m_info.water if m_info else "0",
            "water2": m_info.water2 if m_info else "0",
            "sewer": m_info.sewer if m_info else "0",
            "sewer2": m_info.sewer2 if m_info else "0",
            "trash": m_info.trash if m_info else "0",
            "trash5": m_info.trash5 if m_info else "0",
            "electric": m_info.electric if m_info else "0",
            "electric2": m_info.electric2 if m_info else "0",
            "gas": m_info.gas if m_info else "0",
            "gas2_propane": m_info.gas2_propane if m_info else "0",
            "irrigation": m_info.irrigation if m_info else "0",
            "base_basic": m_info.base_basic if m_info else "0",
            "stormwater": m_info.stormwater if m_info else "0",
            "resident_code": res.resident_code if res else None,
            "resident_id": res.resident_id if res else None,
            "lease_id": res.lease.billing_lease_id if res and res.lease else "-",
            "move_in": res.move_in if res else "-",
            "renewal": res.renewal if res else "-",
            "admin_notes": res.admin_notes if res else "-",
            "lease_states": l.states if l else "-",
            "lease_intro": l.intro if l else "-",
            "lease_retirement": l.retirement if l else "-",
            "lease_renewal": l.renewal if l else "-",
            "lease_required_utilities": l.required_utilities if l else "-",
            "lease_switchable_utilities": l.switchable_utilities if l else "-",
            "lease_vacant_utilities": l.vacant_utilities if l else "-",
            "lease_service_fee": str(l.service_fee) if l and l.service_fee is not None else "-",
            "lease_renewal_fee": str(l.renewal_fee) if l and l.renewal_fee is not None else "-",
            "lease_setup_fee": str(l.setup_fee) if l and l.setup_fee is not None else "-",
            "lease_move_out_fee": str(l.move_out_fee) if l and l.move_out_fee is not None else "-",
            "lease_vsf": str(l.vacant_service_fee) if l and l.vacant_service_fee is not None else "-",
            "lease_other_fees": l.other_fees if l else "-",
            "lease_notes": l.lease_notes if l else "-",
            "lease_grace_period": l.grace_period if l else "-"
        })

    return jsonify(output)

@app.route('/get_lease_details/<int:lease_id>')
def get_lease_details(lease_id):
    lease = Leases.query.get(lease_id)
    return render_template('partials/lease_details.html', lease=lease)

@app.route('/billing_summary')
def billing_summary():
    page = request.args.get('page', 1, type=int)
    search_query = request.args.get('q', '')
    
    available_dates = db.session.query(MonthlyData.post_month).distinct().order_by(desc(MonthlyData.post_month)).all()
    date_list = [d[0] for d in available_dates if d[0] is not None]


    selected_date_str = request.args.get('post_month')
    if selected_date_str:
        selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
    elif date_list:
        selected_date = date_list[0]
    else:
        selected_date = None

    query = MonthlyData.query.join(Resident).join(Home)

    if selected_date:
        query = query.filter(MonthlyData.post_month == selected_date)

    query = apply_search(query, Home, search_query)

    pagination = query.paginate(page=page, per_page=500, error_out=False)
    billing_records = pagination.items

    status_counts = []
    if selected_date:
        status_counts = db.session.query(
            MonthlyData.status, func.count(MonthlyData.monthly_id)
            ).filter(MonthlyData.post_month == selected_date).group_by(MonthlyData.status).all()

    return render_template('billing_summary.html',
                           title="Billing Summary",
                           billing_records=billing_records,
                           pagination=pagination,
                           date_list=date_list, 
                           selected_date=selected_date, 
                           status_counts=status_counts,
                           search_query=search_query)

@app.route('/imports', methods=['GET','POST'])
def imports():
    if request.method == 'POST':
        file = request.files.get('file')
        table_choice = request.form.get('target_table')

        if not file:
            flash("No file selected!", "failure")
            return redirect(url_for('imports'))
        
        df = pd.read_csv(file, encoding='ISO-8859-1') if file.filename.endswith('.csv') else pd.read_excel(file)
        df = df.astype(object).replace({np.nan: None})

        if table_choice == "Home":
            mgmtco_lookup = {mc.mgmt_co: mc.id for mc in ManagementCompanies.query.all()}
            marketrule_lookup = {mr.market_name: mr.market_rules_id for mr in MarketRules.query.all()}
            bc_lookup = {tm.nickname: tm.employee_id for tm in TeamRegister.query.filter(TeamRegister.role == 'Billing Coordinator').all()}
            bm_lookup = {tm.nickname: tm.employee_id for tm in TeamRegister.query.filter(TeamRegister.role == 'Billing Manager').all()}
            qc_lookup = {tm.nickname: tm.employee_id for tm in TeamRegister.query.filter(TeamRegister.role == 'QC Specialist').all()}
            for index, row in df.iterrows():
                market_rules_id = marketrule_lookup.get(row.get('Market Rules'))
                mgmtco_id = mgmtco_lookup.get(row.get('Management Company'))
                bc_assignee = bc_lookup.get(row.get('BC Nickname'))
                bm_assignee = bm_lookup.get(row.get('BM Nickname'))
                qc_assignee = qc_lookup.get(row.get('QC Nickname'))
                new_entry = Home(
                    prop_code=clean_val(row.get('*Prop Code')),
                    reo_id=clean_val(row.get('*REO ID')),
                    address=clean_val(row.get('*Address')),
                    city=clean_val(row.get('*City')),
                    state=clean_val(row.get('*State')),
                    sq_ft=clean_val(row.get('Sq Ft')),
                    bedrooms=clean_val(row.get('Bedrooms')),
                    multi_unit_num=clean_val(row.get('Multi Unit Num')),
                    market=clean_val(row.get('Market')),
                    market_rules_id=clean_val(market_rules_id),
                    mgmt_co_id=clean_val(mgmtco_id),
                    acquired_from=clean_val(row.get('Acquired From')),
                    bc_assignee=clean_val(bc_assignee),
                    bm_assignee=clean_val(bm_assignee),
                    qc_assignee=clean_val(qc_assignee)
                )
                db.session.add(new_entry)

        elif table_choice == "Resident":
            df['*Move-In Date'] = pd.to_datetime(df['*Move-In Date'], errors='coerce')
            df['Renewal Date'] = pd.to_datetime(df['Renewal Date'], errors='coerce')

            home_lookup = {h.prop_code: h.home_id for h in Home.query.all()}
            lease_lookup = {l.billing_lease_id: l.lease_id for l in Leases.query.all()}

            for index, row in df.iterrows():
                move_in_val = clean_val(row.get('*Move-In Date'))
                move_in_date = move_in_val.date() if pd.notnull(move_in_val) else None

                renewal_val = clean_val(row.get('Renewal Date'))
                renewal_date = renewal_val.date() if pd.notnull(renewal_val) else None

                home_id = home_lookup.get(clean_val(row.get('*Prop Code')))
                lease_id = lease_lookup.get(clean_val(row.get('Lease ID')))
                new_entry = Resident(
                    home_id=home_id,
                    lease_id=lease_id,
                    resident_code=clean_val(row.get('*Resident Acct #')),
                    move_in=move_in_date,
                    renewal=renewal_date,
                    admin_notes=clean_val(row.get('Admin Notes'))
                )
                db.session.add(new_entry)

                db.session.flush()

                new_monthly = MonthlyData(
                    resident_id=new_entry.resident_id,
                    rollout=1,
                    action_note=0,
                    post_month=get_current_post_month()
                )
                db.session.add(new_monthly)

            db.session.commit()

        elif table_choice == "Team Member":
            for index, row in df.iterrows():
                new_entry = TeamRegister(
                    role=clean_val(row.get('Position')),
                    name=clean_val(row.get('Name')),
                    nickname=clean_val(row.get('Nickname')),
                    email=clean_val(row.get('Email')),
                    manager_name=clean_val(row.get('Manager Nickname'))
                )
                db.session.add(new_entry)
        
        elif table_choice == "Management Company":
            for index, row in df.iterrows():
                new_entry = ManagementCompanies(
                    mgmt_co=clean_val(row.get('*Management Company')),
                    mgmt_nickname=clean_val(row.get('*MgmtCo Nickname')),
                    mgmt_abbreviation=clean_val(row.get('MgmtCo Abbreviation'))
                )
                db.session.add(new_entry)

        elif table_choice == "Market Rules":
            mgmtco_lookup = {mc.mgmt_co: mc.id for mc in ManagementCompanies.query.all()}
            for index, row in df.iterrows():
                mgmt_co_id = mgmtco_lookup.get(clean_val(row.get('Management Company')))
                new_entry = MarketRules(
                    mgmt_co_id=mgmt_co_id,
                    market_name=clean_val(row.get('Market Name')),
                    market_rules=clean_val(row.get('Market Rules'))
                )
                db.session.add(new_entry)

        elif table_choice == "Leases":
            for index, row in df.iterrows():
                new_entry = Leases(
                    billing_lease_id=clean_val(row.get('*Lease ID')),
                    states=clean_val(row.get('States')),
                    intro=clean_val(row.get('Intro Date')),
                    retirement=clean_val(row.get('Retirement Date')),
                    renewal=clean_val(row.get('Renewal Date')),
                    required_utilities=clean_val(row.get('Required Utilities')),
                    switchable_utilities=clean_val(row.get('Switchable Utilities')),
                    vacant_utilities=clean_val(row.get('Vacant Utilities')),
                    service_fee=clean_val(row.get('Service Fee')),
                    renewal_fee=clean_val(row.get('Renewal Fee')),
                    setup_fee=clean_val(row.get('Setup Fee')),
                    move_out_fee=clean_val(row.get('Move Out Fee')),
                    vacant_service_fee=clean_val(row.get('Vacant Service Fee')),
                    grace_period=clean_val(row.get('Grace Period')),
                    other_fees=clean_val(row.get('Other Fees')),
                    lease_notes=clean_val(row.get('Lease Notes'))
                )
                db.session.add(new_entry)

        db.session.commit()
        flash("File imported successfully!", "success")
        return redirect(url_for('imports'))

    return render_template('imports.html', title="Imports")

@app.route('/leadership_tools', methods=['GET','POST'])
def leadership_tools():
    return render_template('leadership_tools.html', title="Leadership Tools")

@app.route('/run_monthly_reset', methods=['POST'])
def run_monthly_reset():
    data = request.get_json()
    new_date = data.get('date')
    password = data.get('password')

    if password != TEAM_LEAD_PASS:
        return jsonify({"success": False, "message": "Incorrect password."}), 403
    
    try:
        setting = SystemSettings.query.filter_by(setting_key='current_post_month').first()
        if not setting:
            setting = SystemSettings(setting_key='current_post_month')
            db.session.add(setting)
        setting.setting_value = new_date

        sql = text("""
                   INSERT INTO MonthlyData (resident_id, rollout, action_note, post_month, status)
                   SELECT Resident.resident_id, 0, 0, :post_month, 'New'
                   FROM Resident
                   WHERE NOT EXISTS (
                       SELECT 1 FROM MonthlyData
                       WHERE MonthlyData.resident_id = Resident.resident_id AND MonthlyData.post_month = :post_month
                   )
                   """)
        
        db.session.execute(sql, {"post_month": new_date})
        db.session.commit()

        return jsonify({"success": True, "message": f"Post Month updated to {new_date}"})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/table_view', methods=['GET','POST'])
def table_view():
    table_map = {
        'Homes': Home,
        'Resident': Resident,
        'Leases': Leases,
        'Team Register': TeamRegister,
        'Management Companies': ManagementCompanies,
        'Market Rules': MarketRules,
        'System Settings': SystemSettings,
        'Monthly Data': MonthlyData
    }
    target = request.args.get('table', 'Homes')
    search_query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    model = table_map.get(target, Home)
    query = model.query
    query = apply_search(query, model, search_query)
    columns = [column.key for column in model.__table__.columns]
    pagination = query.paginate(page=page, per_page=1000, error_out=False)
    records = pagination.items

    return render_template('table_view.html', 
                           title="Table View",
                           columns=columns, 
                           records=records, 
                           pagination=pagination, 
                           current_table=target,
                           table_names=table_map.keys())

@app.route('/progress_report', methods=['GET'])
def progress_report():
    current_month = get_current_post_month()

    status_counts = db.session.query(
        MonthlyData.status, func.count(MonthlyData.monthly_id)
    ).filter(MonthlyData.post_month == current_month)\
        .group_by(MonthlyData.status).all()
    
    stats = {status: count for status, count in status_counts}
    stats['total'] = sum(stats.values())

    #market_breakdown = db.session.query(
    #    Home.market, func.count(MonthlyData.status)
    #).join(Resident, Home.home_id == Resident.home_id)\
     #.join(MonthlyData, Resident.resident_id == MonthlyData.resident_id)\
     #.filter(MonthlyData.post_month == current_month)\
     #.group_by(Home.market).all()
    

    bc_performance = db.session.query(
        TeamRegister.nickname,
        func.count(MonthlyData.monthly_id)
    ).join(MonthlyData, TeamRegister.employee_id == MonthlyData.billed_by)\
     .filter(MonthlyData.post_month == current_month, MonthlyData.status.in_(['Approved', 'QC Complete', 'Mailed']))\
     .group_by(TeamRegister.nickname).all()
    
    integrity = {
        'missing_leases': Resident.query.filter(Resident.lease_id == None).count(),
        'vacant_homes': Home.query.outerjoin(Resident).filter(Resident.resident_id == None).count(),
        'unassigned_bc': Home.query.filter(Home.bc_assignee == None).count(),
        'unassigned_bm': Home.query.filter(Home.bm_assignee == None).count(),
        'unassigned_qc': Home.query.filter(Home.qc_assignee == None).count(),
        'missing_market': Home.query.filter(Home.market == None).count()
    }
    return render_template('progress_report.html', 
                           title="Progress Report",
                           stats=stats,
                           integrity=integrity,
                           bc_performance=bc_performance,
                           current_month=current_month.strftime('%B %Y'))

@app.route('/api/progress_report')
def get_progress_report():
    current_month = get_current_post_month()

    results = db.session.query(
        Home.state, 
        ManagementCompanies.mgmt_nickname,

        func.count(Home.home_id).label('total'),
        func.sum(case((MonthlyData.status == 'New',1), else_=0)).label('new'),
        func.sum(case((MonthlyData.status == 'Approved',1), else_=0)).label('approved'),
        func.sum(case((MonthlyData.status == 'QC Complete',1), else_=0)).label('qc_complete'),
        func.sum(case((MonthlyData.status == 'Mailed',1), else_=0)).label('mailed')
    ).join(ManagementCompanies, Home.mgmt_co_id == ManagementCompanies.id)\
     .outerjoin(Resident, Home.home_id == Resident.home_id)\
     .outerjoin(MonthlyData, (Resident.resident_id == MonthlyData.resident_id) & (MonthlyData.post_month == current_month))\
     .filter(Home.state != None)\
     .order_by(ManagementCompanies.mgmt_nickname, Home.state)\
     .group_by(Home.state, ManagementCompanies.mgmt_nickname).all()

    output = []
    for r in results:
        output.append({
            "state": r.state,
            "management_co": r.mgmt_nickname,
            "total": r.total,
            "new": r.new,
            "approved": r.approved,
            "qc_complete": r.qc_complete,
            "mailed": r.mailed
        })

    return jsonify(output)

# Tables
class SystemSettings(db.Model):
    __tablename__ = 'SystemSettings'
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(50), unique=True)
    setting_value = db.Column(db.String(255))

class ManagementCompanies(db.Model):
    __tablename__ = 'ManagementCompanies'
    id = db.Column(db.Integer, primary_key=True)
    mgmt_co = db.Column(db.String(255))
    mgmt_nickname = db.Column(db.String(100))
    mgmt_abbreviation = db.Column(db.String(5))

    markets = db.relationship('MarketRules', backref='management_company', lazy=True)
    homes = db.relationship('Home', backref='management_company', lazy=True)

class MarketRules(db.Model):
    __tablename__ = 'MarketRules'
    market_rules_id = db.Column(db.Integer, primary_key=True)
    mgmt_co_id = db.Column(db.Integer, db.ForeignKey('ManagementCompanies.id'))
    market_name = db.Column(db.String(255))
    market_rules = db.Column(db.Text)

class TeamRegister(db.Model):
    __tablename__ = 'TeamRegister'
    employee_id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.Enum('Project Manager','Team Lead','Assistant Team Lead','QC Specialist','Billing Manager','Billing Coordinator'))
    name = db.Column(db.String(50))
    nickname = db.Column(db.String(50))
    email = db.Column(db.String(50))
    manager_name = db.Column(db.String(50), db.ForeignKey('TeamRegister.name'))

    manager = db.relationship('TeamRegister', remote_side=[name], backref='subordinates')

class Home(db.Model):
    __tablename__ = 'Home'
    home_id = db.Column(db.Integer, primary_key=True)
    prop_code = db.Column(db.String(12))
    reo_id = db.Column(db.String(100))
    address = db.Column(db.String(100))
    city = db.Column(db.String(100))
    state = db.Column(db.String(2))
    sq_ft = db.Column(db.Integer)
    bedrooms = db.Column(db.Integer)
    multi_unit_num = db.Column(db.Integer)
    market = db.Column(db.String(100))
    market_rules_id = db.Column(db.Integer, db.ForeignKey('MarketRules.market_rules_id'))
    mgmt_co_id = db.Column(db.Integer, db.ForeignKey('ManagementCompanies.id'))
    acquired_from = db.Column(db.String(100))
    bc_assignee = db.Column(db.Integer, db.ForeignKey('TeamRegister.employee_id'))
    bm_assignee = db.Column(db.Integer, db.ForeignKey('TeamRegister.employee_id'))
    qc_assignee = db.Column(db.Integer, db.ForeignKey('TeamRegister.employee_id'))

    bc_user = db.relationship('TeamRegister', foreign_keys=[bc_assignee], backref='bc_homes')
    bm_user = db.relationship('TeamRegister', foreign_keys=[bm_assignee], backref='bm_homes')
    qc_user = db.relationship('TeamRegister', foreign_keys=[qc_assignee], backref='qc_homes')
    mrkt_rls = db.relationship('MarketRules', foreign_keys=[market_rules_id], backref='home')
    residents = db.relationship('Resident', backref='home', lazy=True)

class Leases(db.Model):
    __tablename__ = 'Leases'
    lease_id = db.Column(db.Integer, primary_key=True)
    intro = db.Column(db.Date)
    retirement = db.Column(db.Date)
    renewal = db.Column(db.Date)
    service_fee = db.Column(db.Numeric(4,2))
    renewal_fee = db.Column(db.Numeric(4,2))
    setup_fee = db.Column(db.Numeric(5,2))
    move_out_fee = db.Column(db.Numeric(5,2))
    vacant_service_fee = db.Column(db.Numeric(5,2))
    grace_period = db.Column(db.Integer)
    billing_lease_id = db.Column(db.String(10))
    states = db.Column(db.String(100))
    required_utilities = db.Column(db.String(25))
    switchable_utilities = db.Column(db.String(25))
    vacant_utilities = db.Column(db.String(25))
    other_fees = db.Column(db.String(1000))
    lease_notes = db.Column(db.String(1000))

    lease_rel = db.relationship('Resident', backref='lease', lazy=True)

class Resident(db.Model):
    __tablename__ = 'Resident'
    resident_id = db.Column(db.Integer, primary_key=True)
    home_id = db.Column(db.Integer, db.ForeignKey('Home.home_id'))
    lease_id = db.Column(db.Integer, db.ForeignKey('Leases.lease_id'))
    resident_code = db.Column(db.String(100))
    admin_notes = db.Column(db.Text)
    move_in = db.Column(db.Date)
    renewal = db.Column(db.Date)

    monthly_info = db.relationship('MonthlyData', backref='resident', lazy=True)

class MonthlyData(db.Model):
    __tablename__ = 'MonthlyData'
    monthly_id = db.Column(db.Integer, primary_key=True)
    resident_id = db.Column(db.Integer, db.ForeignKey('Resident.resident_id'))
    rollout = db.Column(db.Boolean)
    action_note = db.Column(db.Boolean)
    billing_note = db.Column(db.String(500))
    quick_note = db.Column(db.String(255))
    post_month = db.Column(db.Date)
    status = db.Column(db.String(255))
    billed_by = db.Column(db.Integer, db.ForeignKey('TeamRegister.employee_id'))
    water = db.Column(db.Integer)
    water2 = db.Column(db.Integer)
    sewer = db.Column(db.Integer)
    sewer2 = db.Column(db.Integer)
    trash = db.Column(db.Integer)
    trash5 = db.Column(db.Integer)
    electric = db.Column(db.Integer)
    electric2 = db.Column(db.Integer)
    gas = db.Column(db.Integer)
    gas2_propane = db.Column(db.Integer)
    irrigation = db.Column(db.Integer)
    base_basic = db.Column(db.Integer)
    stormwater = db.Column(db.Integer)

    billed_by_user = db.relationship('TeamRegister', backref='monthly_data', lazy=True)

    def to_dict(self):
        return {
            "resident_id": self.resident_id,
            "rollout": self.rollout,
            "action_note": self.action_note,
            "billing_note": self.billing_note,
            "quick_note": self.quick_note,
            "post_month": self.post_month,
            "status": self.status,
            "billed_by": self.billed_by_user.nickname if self.billed_by_user else "-",
            "home_code": self.resident.home.prop_code,
            "bc_assignee": self.resident.home.bc_user.nickname if self.resident.home.bc_user else "unassigned",
            "bm_assignee": self.resident.home.bm_user.nickname if self.resident.home.bm_user else "unassigned",
            "qc_assignee": self.resident.home.qc_user.nickname if self.resident.home.qc_user else "unassigned"
        }

@app.route('/api/data', methods=['GET'])
def get_data():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 1000, type=int)

    query = Home.query
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    output = []
    for item in pagination.items:
        output.append({'bc_assignee': item.bc_user.nickname if item.bc_user else "unassigned", 'prop_code': item.prop_code, 'reo_id': item.reo_id})
    return jsonify({
        'data': output,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'total_items': pagination.total
    })


if __name__ == '__main__':
    app.run(debug=True)