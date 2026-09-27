#!/usr/bin/env python3
"""
Verify data/fueleu_group_contacts.json.

For every contact in every group, fetches contact['sourceUrl'] (browser UA,
redirects followed, 20s timeout), normalises whitespace/HTML entities, and
checks that each populated field (email, phone digits, name) appears on the
page. Also resolves DNS for the email domain (if any) and for the group's
website. Writes data/fueleu_group_contacts.verification.json with per-contact
pass/fail + reason, and exits non-zero if any contact fails.

Usage:
    python scripts/verify_fueleu_contacts.py
"""
import json
import re
import socket
import sys
import html
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "fueleu_group_contacts.json"
OUT_PATH = ROOT / "data" / "fueleu_group_contacts.verification.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = 20
_PAGE_CACHE = {}


def normalize_text(raw: str) -> str:
    text = html.unescape(raw)
    # Pull mailto:/tel: href/attribute values out before tags are stripped,
    # since email/phone are often only present as link targets, not text.
    hrefs = re.findall(r'(?:href|data-href)\s*=\s*["\']([^"\']+)["\']', text, flags=re.I)
    extra = []
    for h in hrefs:
        if h.lower().startswith("mailto:") or h.lower().startswith("tel:"):
            extra.append(h.split(":", 1)[1].split("?", 1)[0])
    # Strip tags crudely (good enough for substring/digit checks).
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    if extra:
        text = text + " " + " ".join(extra)
    return text.strip()


def fetch_page(url: str):
    """Returns (normalized_text, error) - error is None on success."""
    if url in _PAGE_CACHE:
        return _PAGE_CACHE[url]
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    last_err = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                raw = resp.read()
                charset = resp.headers.get_content_charset() or "utf-8"
                try:
                    decoded = raw.decode(charset, errors="replace")
                except LookupError:
                    decoded = raw.decode("utf-8", errors="replace")
                text = normalize_text(decoded)
                result = (text, None)
                _PAGE_CACHE[url] = result
                return result
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}"
            break  # retrying won't help an HTTP error
        except urllib.error.URLError as e:
            last_err = f"URLError: {e.reason}"
        except Exception as e:  # noqa: BLE001
            last_err = f"Error: {e}"
    result = (None, last_err)
    _PAGE_CACHE[url] = result
    return result


def digits_only(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def phone_matches(phone: str, page_text: str) -> bool:
    target = digits_only(phone)
    if not target:
        return False
    page_digits = digits_only(page_text)
    if target in page_digits:
        return True
    # Allow missing country code: try dropping leading 1-3 digits (country code).
    for drop in range(1, 4):
        if len(target) - drop >= 6 and target[drop:] in page_digits:
            return True
    return False


def name_matches(name: str, page_text: str) -> bool:
    if not name:
        return False
    norm_page = page_text.lower()
    norm_name = re.sub(r"\s+", " ", name).strip().lower()
    if norm_name in norm_page:
        return True
    # Try matching surname only as fallback signal, but require full name normally.
    return False


def domain_of_email(email: str) -> str:
    return email.split("@", 1)[1].strip().rstrip(".") if email and "@" in email else ""


def domain_of_url(url: str) -> str:
    m = re.match(r"^[a-zA-Z]+://([^/]+)", url or "")
    host = m.group(1) if m else (url or "")
    host = host.split("@")[-1].split(":")[0]
    return host


def dns_resolves(host: str) -> bool:
    """True if host has an A/AAAA record, or (for email domains that are
    mail-only) an MX record."""
    if not host:
        return False
    try:
        socket.getaddrinfo(host, None)
        return True
    except Exception:  # noqa: BLE001
        pass
    # Fall back to an MX lookup (common for domains used only for mail).
    try:
        import subprocess
        out = subprocess.run(
            ["nslookup", "-type=MX", host],
            capture_output=True, text=True, timeout=10,
        )
        combined = (out.stdout or "") + (out.stderr or "")
        return "mail exchanger" in combined.lower()
    except Exception:  # noqa: BLE001
        return False


def verify_contact(group_id: str, contact: dict) -> dict:
    result = {
        "group_id": group_id,
        "kind": contact.get("kind"),
        "name": contact.get("name"),
        "sourceUrl": contact.get("sourceUrl"),
        "checks": {},
        "pass": True,
        "reasons": [],
    }

    source_url = contact.get("sourceUrl")
    if not source_url:
        result["pass"] = False
        result["reasons"].append("missing sourceUrl")
        return result

    page_text, err = fetch_page(source_url)
    if err:
        result["pass"] = False
        result["reasons"].append(f"fetch failed: {err}")
        return result

    checked_any = False

    if contact.get("email"):
        checked_any = True
        ok = contact["email"].lower() in page_text.lower()
        result["checks"]["email"] = ok
        if not ok:
            result["pass"] = False
            result["reasons"].append(f"email '{contact['email']}' not found on page")
        else:
            dom = domain_of_email(contact["email"])
            dns_ok = dns_resolves(dom)
            result["checks"]["email_domain_dns"] = dns_ok
            if not dns_ok:
                result["pass"] = False
                result["reasons"].append(f"email domain '{dom}' did not resolve via DNS")

    if contact.get("phone"):
        checked_any = True
        ok = phone_matches(contact["phone"], page_text)
        result["checks"]["phone"] = ok
        if not ok:
            result["pass"] = False
            result["reasons"].append(f"phone '{contact['phone']}' digits not found on page")

    if contact.get("name"):
        checked_any = True
        ok = name_matches(contact["name"], page_text)
        result["checks"]["name"] = ok
        if not ok:
            result["pass"] = False
            result["reasons"].append(f"name '{contact['name']}' not found on page")

    if contact.get("contactFormUrl"):
        checked_any = True
        form_page_text, form_err = fetch_page(contact["contactFormUrl"])
        ok = form_err is None
        result["checks"]["contactFormUrl_reachable"] = ok
        if not ok:
            result["pass"] = False
            result["reasons"].append(f"contactFormUrl unreachable: {form_err}")

    if not checked_any:
        result["pass"] = False
        result["reasons"].append("contact has no verifiable field (email/phone/name/contactFormUrl)")

    return result


def verify_website(group_id: str, website: str) -> dict:
    entry = {"group_id": group_id, "website": website, "dns_resolves": False}
    if not website:
        return entry
    host = domain_of_url(website)
    entry["host"] = host
    entry["dns_resolves"] = dns_resolves(host)
    return entry


def main() -> int:
    if not DATA_PATH.exists():
        print(f"ERROR: {DATA_PATH} not found", file=sys.stderr)
        return 2

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    groups = data.get("groups", [])

    contact_results = []
    website_results = []
    any_fail = False

    for g in groups:
        gid = g.get("group_id")
        website_results.append(verify_website(gid, g.get("website")))
        for c in g.get("contacts", []):
            r = verify_contact(gid, c)
            contact_results.append(r)
            if not r["pass"]:
                any_fail = True

    total_contacts = len(contact_results)
    passed = sum(1 for r in contact_results if r["pass"])
    failed = total_contacts - passed

    summary = {
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "totalGroups": len(groups),
        "totalContacts": total_contacts,
        "passed": passed,
        "failed": failed,
        "websites_checked": len(website_results),
        "websites_resolving": sum(1 for w in website_results if w["dns_resolves"]),
    }

    out = {
        "summary": summary,
        "contacts": contact_results,
        "websites": website_results,
    }
    OUT_PATH.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(summary, indent=2))
    if failed:
        print(f"\n{failed} contact(s) FAILED verification:", file=sys.stderr)
        for r in contact_results:
            if not r["pass"]:
                print(f"  - [{r['group_id']}] {r['kind']} ({r.get('name') or ''}) "
                      f"<- {r['sourceUrl']}: {'; '.join(r['reasons'])}", file=sys.stderr)
        return 1

    print("\nAll contacts verified OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
