"""
Generates and inserts markdown from platform-programs.yml and
independent-programs.yml into the README.md file.
Python 3.6+ is required

Environment Variables (all optional)
    - LOG_LEVEL: The log level to use: info | warn | error (default: INFO).
    - REPO_OWNER: The username / org where the repository is located.
    - REPO_NAME: The name of the repository.
"""

# Imports
import os, re, yaml, logging
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
BOUNTIES_FILE_PATH = os.path.join(SCRIPT_DIR, "..", "platform-programs.yml")
INDEPENDENT_FILE_PATH = os.path.join(SCRIPT_DIR, "..", "independent-programs.yml")


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
        logger.info(f"Writing to file: {file_path}")
        f.write(content)



def format_long_string(url: str) -> str:
    """
    Makes URLs to users blogs and twitter profiles look nicer.
    Removes www., http://, https:// and trailing slashes from a URL.
    Also limits to 40 characters and replaces with ellipsis if longer
    """
    url = url.replace("www.", "").replace("http://", "").replace("https://", "")
    url = url.rstrip("/")
    return url[:40] + (url[40:] and "...")


def build_markdown_content(companies) -> str:
    """
    Converts the YAML content into markdown content.
    Only includes programs that have at least one reward and a contact link,
    since GitHub truncates READMEs beyond 512 KB.
    """

    if not companies:
        logger.info("There's no companies yet, cancelling markdown generation")
        return ""

    reward_emoji = {
        "*bounty": "\U0001f4b0",
        "*recognition": "\U0001f3c5",
        "*swag": "\U0001f381",
    }

    # Filter to programs worth showing - must have rewards and a submit link
    companies = [c for c in companies if c.get("rewards") and c.get("contact")]
    companies.sort(key=lambda x: x['company'].lower())
    logger.info(f"Showing {len(companies)} programs with rewards + contact")

    # Group by first letter
    groups = {}
    for company in companies:
        first = company["company"][0].upper()
        if not first.isalpha():
            first = "#"
        groups.setdefault(first, []).append(company)

    md_content = ""
    md_content += "<details>\n<summary><b>Expand List</b></summary>\n"
    md_content += "<sub><b>Key:</b> 💰 = bounty. 🏅 = shout-out. 🎁 = swag.<br>"
    md_content += "View full list and details at <a href=\"https://bug-bounties.as93.net/\">bug-bounties.as93.net</a></sub>\n"
    for letter in sorted(groups.keys(), key=lambda k: (k == "#", k)):
        group = groups[letter]
        md_content += f"<details open><summary><h4>{letter}</h4></summary>\n\n"
        for company in group:
            company_name = company["company"]
            company_url = company["url"]
            resource_host = urlparse(company_url).hostname
            icon_tag = f"<img src='https://icon.horse/icon/{resource_host}' width='16'/>"
            rewards = " ".join(reward_emoji.get(r, r) for r in company["rewards"])
            md_content += f"- {icon_tag} [{format_long_string(company_name)}]({company_url}) {rewards}\n"
        md_content += "\n</details>\n"

    md_content += "</details>\n\n"
    return md_content


""" The main entrypoint of the script """
if __name__ == "__main__":
    # Read platform programs YAML
    yaml_content = yaml.safe_load(read_file(BOUNTIES_FILE_PATH))
    companies = yaml_content.get("companies", [])

    # Read independent programs YAML (if it exists)
    if os.path.exists(INDEPENDENT_FILE_PATH):
        ind_content = yaml.safe_load(read_file(INDEPENDENT_FILE_PATH))
        if ind_content and ind_content.get("companies"):
            companies = companies + ind_content["companies"]

    # Deduplicate by normalized company name
    seen = set()
    unique = []
    for c in companies:
        key = c.get("company", "").strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(c)
    companies = unique

    # Read current README
    readme_content = read_file(README_PATH)
    # Generate content to be inserted
    new_md_content = build_markdown_content(companies)
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
    logger.info("All Done!")

"""
Okay, you've got this far...
As you can tell this is a pretty quickly-put-together and hacky script
And there's definitely plenty of room for improvement!
So if you're up for it, feel free to submit a PR :)
"""
