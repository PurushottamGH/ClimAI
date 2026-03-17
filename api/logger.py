import logging
import os
import sys

# Ensure logs directory exists if needed, but logging in the same dir for now
try:
    logging.basicConfig(
        filename="climai.log",
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )
except (PermissionError, OSError):
    # Fallback to console logging if file system is read-only (e.g. on certain Render tiers)
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s"
    )

def log(message):
    """
    Centralized logging function.
    Accepts strings or dictionaries (which are logged as strings).
    """
    try:
        logging.info(str(message))
    except:
        print(f"FAILED TO LOG: {message}")
