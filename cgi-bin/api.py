#!/usr/bin/env python3
"""
API Gateway for Business Health Report
Handles PageSpeed, Places Lookup, Competitors, and Config endpoints.
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_FILE = os.path.join(PROJECT_DIR, "api_config.json")

# ---------- Helpers ----------

def get_query_params():
    qs = os.environ.get("QUERY_STRING", "")
    params = {}
    for pair in qs.split("&"):
        if "=" in pair:
            k, v = pair.split("=", 1)
            params[urllib.parse.unquote(k)] = urllib.parse.unquote(v)
    return params

def respond(data, status=200):
    print(f"Status: {status}")
    print("Content-Type: application/json")
    print()
    print(json.dumps(data))
    sys.exit(0)

def respond_error(msg, status=400):
    respond({"error": msg, "success": False}, status)

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

def save_config(data):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f)
        return True
    except:
        return False

def api_fetch(url, timeout=25):
    """Fetch a URL and return parsed JSON."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HealthReport/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            err_data = json.loads(body)
            msg = err_data.get("error", {}).get("message", str(e))
        except:
            msg = str(e)
        return {"_error": True, "_message": msg, "_status": e.code}
    except Exception as e:
        return {"_error": True, "_message": str(e), "_status": 500}

def get_api_key(params):
    """Get API key from query params or config file."""
    key = params.get("key", "").strip()
    if key:
        return key
    cfg = load_config()
    return cfg.get("google_api_key", "")

# ---------- PageSpeed Insights ----------

def handle_pagespeed(params):
    url = params.get("url", "").strip()
    if not url:
        respond_error("Missing 'url' parameter")

    # Ensure URL has protocol
    if not url.startswith("http"):
        url = "https://" + url

    api_key = get_api_key(params)

    # Build API URL
    api_url = (
        "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?"
        + urllib.parse.urlencode({
            "url": url,
            "strategy": "mobile",
            "category": ["performance", "accessibility", "seo"],
        }, doseq=True)
    )
    if api_key:
        api_url += "&key=" + urllib.parse.quote(api_key)

    data = api_fetch(api_url)

    if data.get("_error"):
        respond_error(f"PageSpeed API error: {data.get('_message', 'Unknown')}", data.get("_status", 500))

    # Extract Lighthouse data
    try:
        lh = data.get("lighthouseResult", {})
        audits = lh.get("audits", {})
        categories = lh.get("categories", {})

        perf_score = round((categories.get("performance", {}).get("score", 0) or 0) * 100)
        seo_score = round((categories.get("seo", {}).get("score", 0) or 0) * 100)
        accessibility_score = round((categories.get("accessibility", {}).get("score", 0) or 0) * 100)

        fcp = audits.get("first-contentful-paint", {}).get("numericValue", 0) / 1000
        si = audits.get("speed-index", {}).get("numericValue", 0) / 1000
        lcp = audits.get("largest-contentful-paint", {}).get("numericValue", 0) / 1000
        tti = audits.get("interactive", {}).get("numericValue", 0) / 1000
        tbt = audits.get("total-blocking-time", {}).get("numericValue", 0)
        cls = audits.get("cumulative-layout-shift", {}).get("numericValue", 0)

        # Overall load time approximation (use LCP as primary, fallback to speed-index)
        load_time = round(lcp, 1) if lcp > 0 else round(si, 1)

        # Mobile-friendly check from viewport audit
        viewport_audit = audits.get("viewport", {})
        mobile_friendly = viewport_audit.get("score", 0) == 1

        # SSL check
        has_ssl = url.startswith("https")

        result = {
            "success": True,
            "url": url,
            "performanceScore": perf_score,
            "seoScore": seo_score,
            "accessibilityScore": accessibility_score,
            "firstContentfulPaint": round(fcp, 2),
            "speedIndex": round(si, 2),
            "largestContentfulPaint": round(lcp, 2),
            "timeToInteractive": round(tti, 2),
            "totalBlockingTime": round(tbt),
            "cumulativeLayoutShift": round(cls, 3),
            "loadTime": load_time,
            "mobileFriendly": mobile_friendly,
            "hasSSL": has_ssl,
        }
        respond(result)

    except Exception as e:
        respond_error(f"Error parsing PageSpeed data: {str(e)}", 500)

# ---------- Business Lookup (Places API) ----------

def handle_lookup(params):
    input_val = params.get("input", "").strip()
    input_type = params.get("type", "").strip()
    if not input_val:
        respond_error("Missing 'input' parameter")

    api_key = get_api_key(params)
    if not api_key:
        respond_error("Google API key required for business lookup. Add your key in Settings.", 401)

    # Step 1: Find Place
    if input_type == "phone":
        # Format phone for Google: needs country code
        phone_clean = input_val.replace(" ", "").replace("-", "").replace("(", "").replace(")", "").replace(".", "")
        if not phone_clean.startswith("+"):
            if phone_clean.startswith("1") and len(phone_clean) == 11:
                phone_clean = "+" + phone_clean
            else:
                phone_clean = "+1" + phone_clean
        find_url = (
            "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?"
            + urllib.parse.urlencode({
                "input": phone_clean,
                "inputtype": "phonenumber",
                "fields": "place_id,name,formatted_address,business_status,types",
                "key": api_key,
            })
        )
    else:
        find_url = (
            "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?"
            + urllib.parse.urlencode({
                "input": input_val,
                "inputtype": "textquery",
                "fields": "place_id,name,formatted_address,business_status,types",
                "key": api_key,
            })
        )

    find_data = api_fetch(find_url)
    if find_data.get("_error"):
        respond_error(f"Places Find API error: {find_data.get('_message')}", find_data.get("_status", 500))

    candidates = find_data.get("candidates", [])
    if not candidates:
        respond_error("No business found for the given input", 404)

    place_id = candidates[0].get("place_id")
    if not place_id:
        respond_error("Could not resolve place_id", 404)

    # Step 2: Place Details
    details_url = (
        "https://maps.googleapis.com/maps/api/place/details/json?"
        + urllib.parse.urlencode({
            "place_id": place_id,
            "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,reviews,types,opening_hours,photos,url,business_status,address_components,geometry",
            "key": api_key,
        })
    )

    details_data = api_fetch(details_url)
    if details_data.get("_error"):
        respond_error(f"Places Details API error: {details_data.get('_message')}", details_data.get("_status", 500))

    result_obj = details_data.get("result", {})
    if not result_obj:
        respond_error("No details returned for this place", 404)

    # Parse address components
    addr_components = result_obj.get("address_components", [])
    city = ""
    state = ""
    for comp in addr_components:
        types = comp.get("types", [])
        if "locality" in types:
            city = comp.get("long_name", "")
        elif "administrative_area_level_1" in types:
            state = comp.get("short_name", "")

    # Parse reviews (last 5)
    raw_reviews = result_obj.get("reviews", [])
    reviews = []
    for r in raw_reviews[:5]:
        reviews.append({
            "text": r.get("text", ""),
            "rating": r.get("rating", 0),
            "time": r.get("relative_time_description", ""),
            "author": r.get("author_name", ""),
        })

    # Geometry for competitor search
    geometry = result_obj.get("geometry", {})
    location = geometry.get("location", {})

    photos = result_obj.get("photos", [])

    business_data = {
        "success": True,
        "placeId": place_id,
        "businessName": result_obj.get("name", ""),
        "address": result_obj.get("formatted_address", ""),
        "city": city,
        "state": state,
        "phone": result_obj.get("formatted_phone_number", ""),
        "website": result_obj.get("website", ""),
        "rating": result_obj.get("rating", 0),
        "reviewCount": result_obj.get("user_ratings_total", 0),
        "reviews": reviews,
        "types": result_obj.get("types", []),
        "photosCount": len(photos),
        "hasHours": bool(result_obj.get("opening_hours")),
        "isVerified": result_obj.get("business_status", "") == "OPERATIONAL",
        "googleMapsUrl": result_obj.get("url", ""),
        "lat": location.get("lat", 0),
        "lng": location.get("lng", 0),
    }

    respond(business_data)

# ---------- Competitors (Nearby Search) ----------

def handle_competitors(params):
    lat = params.get("lat", "").strip()
    lng = params.get("lng", "").strip()
    biz_type = params.get("type", "").strip()
    exclude_place = params.get("exclude", "").strip()

    if not lat or not lng:
        respond_error("Missing 'lat' and/or 'lng' parameters")

    api_key = get_api_key(params)
    if not api_key:
        respond_error("Google API key required for competitor search", 401)

    # Map common business types to Google Places types
    type_mapping = {
        "restaurant": "restaurant",
        "plumbing": "plumber",
        "hvac": "general_contractor",
        "roofing": "roofing_contractor",
        "dental": "dentist",
        "legal": "lawyer",
        "auto repair": "car_repair",
        "landscaping": "general_contractor",
        "real estate": "real_estate_agency",
        "retail": "store",
        "electrical": "electrician",
        "cleaning": "home_goods_store",
        "beauty": "beauty_salon",
        "fitness": "gym",
        "veterinary": "veterinary_care",
        "painting": "painter",
        "flooring": "general_contractor",
        "pest control": "pest_control",
    }

    google_type = type_mapping.get(biz_type.lower(), "establishment")

    nearby_url = (
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
        + urllib.parse.urlencode({
            "location": f"{lat},{lng}",
            "radius": 8000,
            "type": google_type,
            "key": api_key,
        })
    )

    nearby_data = api_fetch(nearby_url)
    if nearby_data.get("_error"):
        respond_error(f"Nearby Search API error: {nearby_data.get('_message')}", nearby_data.get("_status", 500))

    results = nearby_data.get("results", [])

    # Filter out target business and pick top 5
    competitors = []
    for place in results:
        pid = place.get("place_id", "")
        if pid == exclude_place:
            continue
        if len(competitors) >= 5:
            break

        competitors.append({
            "name": place.get("name", "Unknown"),
            "rating": place.get("rating", 0),
            "reviewCount": place.get("user_ratings_total", 0),
            "address": place.get("vicinity", ""),
            "placeId": pid,
            "types": place.get("types", []),
        })

    respond({
        "success": True,
        "competitors": competitors,
        "totalFound": len(results),
    })

# ---------- Config Endpoints ----------

def handle_config_get():
    cfg = load_config()
    key = cfg.get("google_api_key", "")
    # Only return masked key for security
    masked = ""
    if key:
        masked = key[:8] + "..." + key[-4:] if len(key) > 12 else "****"
    respond({
        "success": True,
        "hasKey": bool(key),
        "maskedKey": masked,
    })

def handle_config_save():
    try:
        raw = sys.stdin.read()
        body = json.loads(raw)
        key = body.get("google_api_key", "").strip()

        cfg = load_config()
        cfg["google_api_key"] = key
        save_config(cfg)

        masked = ""
        if key:
            masked = key[:8] + "..." + key[-4:] if len(key) > 12 else "****"

        respond({
            "success": True,
            "hasKey": bool(key),
            "maskedKey": masked,
        })
    except Exception as e:
        respond_error(f"Error saving config: {str(e)}", 500)

# ---------- Test Key ----------

def handle_test_key(params):
    api_key = params.get("key", "").strip()
    if not api_key:
        respond_error("No API key provided to test")

    # Test with a simple Places Find request
    test_url = (
        "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?"
        + urllib.parse.urlencode({
            "input": "Google",
            "inputtype": "textquery",
            "fields": "place_id",
            "key": api_key,
        })
    )

    data = api_fetch(test_url)
    if data.get("_error"):
        respond_error(f"API key test failed: {data.get('_message')}", data.get("_status", 500))

    status = data.get("status", "")
    if status == "OK" or status == "ZERO_RESULTS":
        respond({"success": True, "message": "API key is valid", "status": status})
    elif status == "REQUEST_DENIED":
        error_msg = data.get("error_message", "Request denied. Check that Places API is enabled.")
        respond_error(f"API key invalid: {error_msg}", 403)
    else:
        respond_error(f"Unexpected status: {status}", 400)

# ---------- Router ----------

method = os.environ.get("REQUEST_METHOD", "GET")
params = get_query_params()
action = params.get("action", "")

try:
    if action == "pagespeed":
        handle_pagespeed(params)
    elif action == "lookup":
        handle_lookup(params)
    elif action == "competitors":
        handle_competitors(params)
    elif action == "config" and method == "GET":
        handle_config_get()
    elif action == "config" and method == "POST":
        handle_config_save()
    elif action == "test_key":
        handle_test_key(params)
    else:
        respond_error(f"Unknown action: '{action}'. Valid: pagespeed, lookup, competitors, config, test_key", 400)
except SystemExit:
    pass
except Exception as e:
    respond_error(f"Internal server error: {str(e)}", 500)
