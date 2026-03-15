import logging
import os

# Ensure logs directory exists if needed, but logging in the same dir for now
logging.basicConfig(
    filename="climai.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def log(message):
    """
    Centralized logging function.
    Accepts strings or dictionaries (which are logged as strings).
    """
    logging.info(str(message))
