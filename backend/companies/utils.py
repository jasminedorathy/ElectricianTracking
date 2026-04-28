def resolve_region(employee, company):
    """
    Resolves the region (country and state) for an employee.
    Logic:
    - country = employee.country OR company.primary_country
    - state = employee.state OR company.default_state
    """
    country = getattr(employee, 'country', None) or getattr(company, 'primary_country', None)
    state = getattr(employee, 'state', None) or getattr(company, 'default_state', None)
    
    return {
        "country": country,
        "state": state
    }


def get_compliance_rules(region):
    """
    Returns compliance rules (overtime threshold, multiplier, etc.) based on region.
    """
    country = region.get("country")
    
    if country == "US":
        return {
            "overtime_threshold": 40.0,
            "overtime_multiplier": 1.5,
            "name": "US FLSA"
        }
    elif country == "UK":
        return {
            "overtime_threshold": 37.5, # Common standard, though WTR is 48
            "overtime_multiplier": 1.0, # UK often doesn't mandate OT pay unless in contract
            "name": "UK WTR"
        }
    
    # Default
    return {
        "overtime_threshold": 40.0,
        "overtime_multiplier": 1.5,
        "name": "Default"
    }
