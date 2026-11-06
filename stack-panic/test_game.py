import re
import os

base_dir = r"C:\Users\JOHN\.gemini\antigravity\scratch\stack-panic"
html_path = os.path.join(base_dir, "index.html")
js_path = os.path.join(base_dir, "game.js")
css_path = os.path.join(base_dir, "styles.css")

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js = f.read()

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# 1. Check all getElementById targets
html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
js_ids = set(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', js))

missing_in_html = js_ids - html_ids
print("HTML unique IDs:", len(html_ids))
print("JS getElementById references:", len(js_ids))
if missing_in_html:
    print("ERROR: Missing IDs in HTML referenced by JS:", missing_in_html)
else:
    print("SUCCESS: All JS element IDs exist in HTML!")

# 2. Check CSS classes referenced in JS
js_classes = set(re.findall(r'classList\.(?:add|remove|contains|toggle)\(["\']([^"\']+)["\']\)', js))
css_classes = set(re.findall(r'\.([a-zA-Z0-9_-]+)', css))
missing_classes = js_classes - css_classes
print("JS classList references:", js_classes)
if missing_classes:
    print("Classes in JS not explicitly styled in CSS:", missing_classes)
else:
    print("SUCCESS: All JS classList targets exist in CSS!")

print("Validation completed successfully.")
