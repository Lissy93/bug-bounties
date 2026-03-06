# Makefile for bug-bounties
#
# Targets:
#   all        - populate bounties, validate, and insert into readme
#   populate   - fetch and merge bounty data from public sources
#   validate   - validate bounties.yml against the JSON schema
#   readme     - insert bounty table into README.md
#   install    - install Python dependencies
#   clean      - remove Python bytecode caches
#   help       - show this help

SHELL := /bin/bash
.DEFAULT_GOAL := all

PYTHON   ?= python3
PIP      ?= pip3
LIB_DIR  := lib
DATA     := platform-programs.yml
INDEP    := independent-programs.yml
SCHEMA   := $(LIB_DIR)/schema.json
README   := .github/README.md
REQS     := $(LIB_DIR)/requirements.txt

.PHONY: all populate validate readme install clean help

all: install populate validate readme

install: $(REQS)  ## Install Python dependencies
	$(PIP) install -r $(REQS)

clean:  ## Remove Python bytecode caches
	find $(LIB_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

populate: $(REQS) | install  ## Fetch and merge bounty data from public sources
	$(PYTHON) $(LIB_DIR)/populate-bounties.py --stats

validate: $(DATA) $(SCHEMA)  ## Validate program YAML files against the JSON schema
	$(PYTHON) $(LIB_DIR)/validate-bounties.py

readme: $(DATA) $(INDEP)  ## Insert bounty table into README.md
	$(PYTHON) $(LIB_DIR)/insert-bounties.py

help:  ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
		| awk -F ':.*## ' '{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
