import re
from typing import Optional

from app.models.enums import TransactionType
from app.schemas.sms import ConfidenceLevel, SMSParseResult


def _to_float(value: str) -> float:
    return float(value.strip().replace(",", ""))


def _infer_category(merchant: str) -> str:
    if not merchant:
        return "Miscellaneous"
    m = merchant.lower()
    if any(x in m for x in ["swiggy", "zomato", "tea", "chai", "cafe", "restaurant", "food", "starbucks", "mcdonald", "burger", "pizza", "kfc", "domino", "biryani", "canteen"]):
        return "Food & Dining"
    if any(x in m for x in ["dmart", "kirana", "bigbasket", "blinkit", "zepto", "instamart", "groceries", "supermarket", "milk", "vegetables", "fruits"]):
        return "Groceries"
    if any(x in m for x in ["uber", "ola", "rapido", "auto", "metro", "petrol", "fuel", "rickshaw", "irctc", "railway", "hpcl", "bpcl", "iocl", "shell"]):
        return "Transport"
    if any(x in m for x in ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "croma", "reliance", "decathlon", "tata cliq", "zara", "h&m", "retail", "store", "shopping"]):
        return "Shopping"
    if any(x in m for x in ["hospital", "pharmacy", "apollo", "1mg", "medical", "clinic", "netmeds", "pharmeasy", "medplus", "doctor", "lab", "diagnostics"]):
        return "Medical"
    if any(x in m for x in ["electricity", "gas", "recharge", "airtel", "jio", "vi", "bescom", "tata power", "bill", "broadband", "wifi", "water", "cylinder", "fastag"]):
        return "Utilities"
    if any(x in m for x in ["rent", "society", "maintenance", "landlord", "nobroker"]):
        return "Housing & Rent"
    if any(x in m for x in ["netflix", "spotify", "bookmyshow", "pvr", "inox", "prime", "hotstar", "youtube", "cinema", "movies", "theatre", "game"]):
        return "Entertainment"
    if any(x in m for x in ["zerodha", "groww", "angel", "upstox", "indmoney", "kuvera", "mutual fund", "sip", "nps", "ppf"]):
        return "Investment"
    if any(x in m for x in ["school", "college", "tuition", "fees", "coursera", "udemy", "unacademy", "coaching", "books", "stationery"]):
        return "Education"
    if any(x in m for x in ["salary", "payroll", "stipend", "dividend", "interest"]):
        return "Salary"
    return "Miscellaneous"


def _extract_balance(text: str) -> Optional[float]:
    m_bal = re.search(
        r"(?:Avl|Avail|Available)\s*(?:Bal|Balance|limit)?\s*(?:is|:)?\s*(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        text,
        re.IGNORECASE,
    )
    if m_bal:
        return _to_float(m_bal.group(1))
    m_bal2 = re.search(
        r"\bBal(?:ance)?\s*(?:is|:)?\s*(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)",
        text,
        re.IGNORECASE,
    )
    if m_bal2:
        return _to_float(m_bal2.group(1))
    return None


def parse_bank_sms(sms_text: str) -> SMSParseResult:
    try:
        if not sms_text or not isinstance(sms_text, str):
            return SMSParseResult(confidence=ConfidenceLevel.LOW)
        text = sms_text.strip()

        # 1. UPI Standard: "Paid/Sent Rs. X to Merchant via/using UPI"
        m_upi = re.search(
            r"(?:Paid|Sent)\s+(?:Rs\.?|INR)?\s*([0-9,.]+)\s+to\s+(.+?)(?:\s+via|\s+using|\s+UPI|$)",
            text,
            re.IGNORECASE,
        )
        if m_upi:
            amt = _to_float(m_upi.group(1))
            merchant = m_upi.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.EXPENSE,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="UPI",
                confidence=ConfidenceLevel.HIGH,
            )

        # 2. HDFC: "Rs. X spent on HDFC Card ending ... at Merchant on/Avl"
        m_hdfc = re.search(
            r"(?:Rs\.?|INR)?\s*([0-9,.]+)\s+spent\s+on.+?\bat\s+(.+?)(?:\s+on|\s+Avl|$)",
            text,
            re.IGNORECASE,
        )
        if m_hdfc:
            amt = _to_float(m_hdfc.group(1))
            merchant = m_hdfc.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.EXPENSE,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="HDFC",
                confidence=ConfidenceLevel.HIGH,
            )

        # 3. SBI: "debited by Rs. X ... transfer to Merchant UPI/Ref/Avl"
        m_sbi = re.search(
            r"debited\s+by\s+(?:Rs\.?|INR)?\s*([0-9,.]+).+?transfer\s+to\s+(.+?)(?:\s+UPI|\s+Ref|\s+Avl|$)",
            text,
            re.IGNORECASE,
        )
        if m_sbi:
            amt = _to_float(m_sbi.group(1))
            merchant = m_sbi.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.EXPENSE,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="SBI",
                confidence=ConfidenceLevel.HIGH,
            )

        # 4. Income: "credited with Rs. X on ... by/from Merchant"
        m_inc = re.search(
            r"credited\s+with\s+(?:Rs\.?|INR)?\s*([0-9,.]+).+?(?:by|from)\s+(.+?)(?:\.|$)",
            text,
            re.IGNORECASE,
        )
        if m_inc:
            amt = _to_float(m_inc.group(1))
            merchant = m_inc.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.INCOME,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="SBI" if "sbi" in text.lower() else ("HDFC" if "hdfc" in text.lower() else None),
                confidence=ConfidenceLevel.HIGH,
            )

        # 5. ICICI: "Your A/C ... is debited for INR X ... at Merchant" or "spent on ICICI Bank Card ... at Merchant"
        m_icici = re.search(
            r"(?:debited\s+for\s+(?:INR|Rs\.?)\s*([0-9,.]+).+?\bat\s+(.+?)(?:\.|\s+on|\s+Avl|$)|spent\s+on\s+ICICI.+?\bat\s+(.+?)(?:\.|\s+on|\s+Avl|$))",
            text,
            re.IGNORECASE,
        )
        if m_icici:
            amt_match = re.search(r"(?:INR|Rs\.?)\s*([0-9,.]+)", text, re.IGNORECASE)
            amt = _to_float(amt_match.group(1)) if amt_match else None
            merchant = (m_icici.group(2) or m_icici.group(3) or "").strip()
            if amt and merchant:
                return SMSParseResult(
                    amount=amt,
                    type=TransactionType.EXPENSE,
                    merchant=merchant,
                    detected_balance=_extract_balance(text),
                    suggested_category=_infer_category(merchant),
                    bank_name="ICICI",
                    confidence=ConfidenceLevel.HIGH,
                )

        # 6. Axis Bank: "INR X debited from Axis Bank A/c ... towards/at Merchant"
        m_axis = re.search(
            r"(?:INR|Rs\.?)\s*([0-9,.]+)\s+debited\s+from\s+Axis\s+Bank.+?(?:towards|to|at)\s+(.+?)(?:\.|\s+Available|\s+on|$)",
            text,
            re.IGNORECASE,
        )
        if m_axis:
            amt = _to_float(m_axis.group(1))
            merchant = m_axis.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.EXPENSE,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="Axis Bank",
                confidence=ConfidenceLevel.HIGH,
            )

        # 7. Kotak Bank: "Rs X debited from Kotak Bank ... to/at Merchant"
        m_kotak = re.search(
            r"(?:Rs\.?|INR)\s*([0-9,.]+)\s+debited\s+from\s+Kotak.+?(?:to|at)\s+(.+?)(?:\.|\s+Bal|\s+on|$)",
            text,
            re.IGNORECASE,
        )
        if m_kotak:
            amt = _to_float(m_kotak.group(1))
            merchant = m_kotak.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.EXPENSE,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="Kotak Bank",
                confidence=ConfidenceLevel.HIGH,
            )

        # 8. Generic Credit/Debit Card Alert: "Transaction of INR X on your Credit Card ... at Merchant"
        m_card = re.search(
            r"(?:Transaction\s+of\s+(?:INR|Rs\.?)\s*([0-9,.]+).+?\bat\s+(.+?)(?:\s+on|\.|$)|Alert:\s*(?:INR|Rs\.?)\s*([0-9,.]+)\s+spent.+?\bat\s+(.+?)(?:\s+on|\.|$))",
            text,
            re.IGNORECASE,
        )
        if m_card:
            amt_str = m_card.group(1) or m_card.group(3)
            merchant = (m_card.group(2) or m_card.group(4) or "").strip()
            if amt_str and merchant:
                return SMSParseResult(
                    amount=_to_float(amt_str),
                    type=TransactionType.EXPENSE,
                    merchant=merchant,
                    detected_balance=_extract_balance(text),
                    suggested_category=_infer_category(merchant),
                    bank_name="Credit Card",
                    confidence=ConfidenceLevel.HIGH,
                )

        # 9. Generic Payment / UPI: "Payment of Rs X to Merchant ... successful" or "Rs X paid to Merchant"
        m_gen_pay = re.search(
            r"(?:Payment\s+of\s+(?:Rs\.?|INR)?\s*([0-9,.]+)\s+to\s+(.+?)(?:\s+was|\s+is|\.|$)|(?:Rs\.?|INR)\s*([0-9,.]+)\s+paid\s+to\s+(.+?)(?:\s+on|\.|$))",
            text,
            re.IGNORECASE,
        )
        if m_gen_pay:
            amt_str = m_gen_pay.group(1) or m_gen_pay.group(3)
            merchant = (m_gen_pay.group(2) or m_gen_pay.group(4) or "").strip()
            if amt_str and merchant:
                return SMSParseResult(
                    amount=_to_float(amt_str),
                    type=TransactionType.EXPENSE,
                    merchant=merchant,
                    detected_balance=_extract_balance(text),
                    suggested_category=_infer_category(merchant),
                    bank_name="UPI",
                    confidence=ConfidenceLevel.HIGH,
                )

        # 10. Fallback Income match: "Rs. X credited to ... from/by Merchant"
        m_gen_inc = re.search(
            r"(?:Rs\.?|INR)\s*([0-9,.]+)\s+credited\s+to.+?(?:by|from)\s+(.+?)(?:\.|\s+on|$)",
            text,
            re.IGNORECASE,
        )
        if m_gen_inc:
            amt = _to_float(m_gen_inc.group(1))
            merchant = m_gen_inc.group(2).strip()
            return SMSParseResult(
                amount=amt,
                type=TransactionType.INCOME,
                merchant=merchant,
                detected_balance=_extract_balance(text),
                suggested_category=_infer_category(merchant),
                bank_name="Bank Transfer",
                confidence=ConfidenceLevel.HIGH,
            )

        return SMSParseResult(confidence=ConfidenceLevel.LOW)
    except Exception:
        return SMSParseResult(confidence=ConfidenceLevel.LOW)
