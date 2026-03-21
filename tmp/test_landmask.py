import sys
import os

def is_land(lat, lon):
    """Accurate land mask using granular continental bounding boxes for smoother coastlines."""
    if lat > 83 or lat < -60: return False
    
    # North America (More granular)
    if 60 < lat < 83 and -141 < lon < -52: return True # Canada North
    if 15 < lat < 60 and -130 < lon < -55: return True # US/Canada/Mexico
    if 7 < lat < 15 and -83 < lon < -77: return True # Central America
    
    # South America (Tapered)
    if -15 < lat < 13 and -82 < lon < -35: return True # North SA
    if -35 < lat < -15 and -75 < lon < -40: return True # Mid SA
    if -56 < lat < -35 and -75 < lon < -65: return True # South SA
    
    # Africa (Tapered)
    if 15 < lat < 37 and -18 < lon < 50: return True # North Africa
    if -10 < lat < 15 and -15 < lon < 52: return True # Central Africa
    if -35 < lat < -10 and 10 < lon < 40: return True # South Africa
    if -25 < lat < -12 and 43 < lon < 51: return True # Madagascar
    
    # Europe (More precise)
    if 36 < lat < 72 and -10 < lon < 45: return True
    if 55 < lat < 72 and 5 < lon < 32: return True # Scandinavia
    if 63 < lat < 67 and -25 < lon < -13: return True # Iceland
    
    # Eurasia (Russia/Asia)
    if 15 < lat < 75 and 45 < lon < 180: return True # Main Eurasia
    if 5 < lat < 35 and 60 < lon < 100: return True # India/South Asia
    if -10 < lat < 25 and 95 < lon < 150: return True # SE Asia islands
    
    # Australia & NZ
    if -40 < lat < -10 and 113 < lon < 154: return True # Australia
    if -48 < lat < -34 and 165 < lon < 179: return True # New Zealand
    
    # Greenland
    if 60 < lat < 84 and -60 < lon < -15: return True
    
    return False

# Test cases (lat, lon)
test_points = [
    (20, 20, True),   # Sahara (Land)
    (0, 0, False),    # Atlantic (Sea)
    (-30, 25, True),  # South Africa (Land)
    (40, -100, True), # USA (Land)
    (40, -20, False), # Atlantic (Sea)
    (-25, 135, True), # Australia (Land)
    (60, 100, True),  # Russia (Land)
    (-70, 0, False),  # Antarctica (Outside bounds)
]

print("Starting land-mask verification...")
failed = 0
for lat, lon, expected in test_points:
    result = is_land(lat, lon)
    if result != expected:
        print(f"FAILED: ({lat}, {lon}) expected {expected}, got {result}")
        failed += 1
    else:
        print(f"PASSED: ({lat}, {lon}) correctly identified as {'Land' if result else 'Sea'}")

if failed == 0:
    print("\nSUCCESS: Land-masking logic looks solid!")
else:
    print(f"\nCOMPLETED with {failed} failures.")
