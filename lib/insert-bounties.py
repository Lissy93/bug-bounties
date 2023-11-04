"""
Generates and inserts markdown from bounties.yml into the README.md file.
Python 3.6+ is required

Environment Variables (all optional)
    - LOG_LEVEL: The log level to use: info | warn | error (default: INFO).
    - REPO_OWNER: The username / org where the repository is located.
    - REPO_NAME: The name of the repository.
"""

# Imports
import os, re, yaml, html, logging
from urllib.parse import urlparse

# Constants
""" The username / org where the repository is located """
REPO_OWNER = os.environ.get("REPO_OWNER", "lissy93")
""" The name of the repository """
REPO_NAME = os.environ.get("REPO_NAME", "bounties")
""" The directory where this script is located """
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
""" The relative path to the markdown file to update"""
README_PATH = os.path.join(SCRIPT_DIR, "..", ".github/README.md")
""" The relative path to the YAML file WITH the user-contributed content """
BOUNTIES_FILE_PATH = os.path.join(SCRIPT_DIR, "..", "bounties.yml")


# Configure Logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger(__name__)


def read_file(file_path: str, mode: str = "r") -> str:
    """
    Opens, reads and returns the contents of a given file.
    :param file_path: The path to the file.
    :param mode: The mode to open the file in.
    :return: The contents of the file.
    """
    try:
        with open(file_path, mode) as f:
            logger.info(f"Reading file: {file_path}")
            return f.read()
    except FileNotFoundError:
        logger.error(f"Error: File {file_path} not found.")
        exit(1)


def write_file(file_path: str, content: str, mode: str = "w") -> None:
    """
    Opens a given file and writes the given content to it.
    :param file_path: The path to the file.
    :param content: The content to write to the file.
    :param mode: The mode to open the file in.
    """
    with open(file_path, mode) as f:
        logging.info(f"Writing to file: {file_path}")
        f.write(content)



def map_reward_to_badge(reward: str) -> str:
    """
    Maps the reward type to the corresponding badge URL.
    :param question: The question to map.
    :return: The mapped question.
    """
    badge_mappings = {
        "*swag": "https://img.shields.io/badge/Swag-fdc500?logo=apachespark&logoColor=000",
        "*recognition": "https://img.shields.io/badge/Shout_out-fd00a6?logo=githubsponsors&logoColor=fff",
        "*bounty": "https://img.shields.io/badge/Cash-5dd21c?logo=cashapp&logoColor=fff"
    }
    return badge_mappings.get(reward, reward)


def format_long_string(url: str) -> str:
    """
    Makes URLs to users blogs and twitter profiles look nicer.
    Removes www., http://, https:// and trailing slashes from a URL.
    Also limits to 25 characters and replaces with ellipse if longer
    """
    url = url.replace("www.", "").replace("http://", "").replace("https://", "")
    url = url.rstrip("/")
    return url[:40] + (url[40:] and "...")


def format_bio_text(bio: str) -> str:
    """
    Returns only a-z, A-Z, 0-9, spaces, and basic punctuation.
    """
    return html.escape(re.sub(r"[^a-zA-Z0-9 ]", "", bio).strip())


def get_link_type(url: str) -> str:
    if url.startswith("mailto:"):
        return "🖃"
    elif url.startswith("http"):
        return "🌐"
    elif url.startswith("twitter"):
        return "🐦"
    else:
        return ""

def build_markdown_content(companies) -> str:
    """
    Converts the YAML content into markdown content.
    :param contributors: The list of contributors from the YAML file.
    :param stargazers: The list of stargazers of the repository.
    :return: The markdown content to be inserted into the README.
    """

    if not companies:
        logger.info(f"There's no companies yet, cancelling markdown generation")
        return ""

    md_content = "Company | Rewards | Submission | Notes\n---|---|---|---\n"
    for company in companies:
        
        company_name = company["company"]
        company_url = company["url"]
        company_contact = company["contact"]
        resource_host = urlparse(company['url']).hostname
        icon_tag = f"<img src='https://icon.horse/icon/{resource_host}' width='20' />"
        link_tag = f"[{get_link_type(company_contact)} Submit]({company_contact})"
        notes = company.get("notes", "")
        rewards = ""
        for reward in company["rewards"]:
            rewards += f"![{reward}]({map_reward_to_badge(reward)}) "


        md_content += (
            f"<a href='{company_url}' title='{company_name}'>{icon_tag} {format_long_string(company_name)}</a> "
            f"| {rewards}"
            f"| {link_tag}"
            f"| {notes}"
            f"\n"
        )
    return md_content


""" The main entrypoint of the script """
if __name__ == "__main__":
    # Read YAML
    yaml_content = yaml.safe_load(read_file(BOUNTIES_FILE_PATH))
    # Read current README
    readme_content = read_file(README_PATH)
    # Generate content to be inserted
    new_md_content = build_markdown_content(yaml_content["companies"])
    # Locate and replace content in README
    start_marker = "<!-- bounties-start -->"
    end_marker = "<!-- bounties-end -->"
    start_index = readme_content.find(start_marker) + len(start_marker)
    end_index = readme_content.find(end_marker)
    # Create new readme (from old readme + new content)
    new_readme_content = (
        readme_content[:start_index]
        + "\n"
        + new_md_content
        + readme_content[end_index:]
    )
    # Write readme content back to file
    write_file(README_PATH, new_readme_content)
    logging.info("All Done!")

"""
Okay, you've got this far...
As you can tell this is a pretty quickly-put-together and hacky script
And there's definitely plenty of room for improvement! 
So if you're up for it, feel free to submit a PR :)
"""
