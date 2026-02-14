import requests
import json

# Replace 'YOUR_GITHUB_TOKEN' with your actual GitHub Personal Access Token
headers = {
    'Authorization': 'token YOU_GITHUB_TOKEN',
    'Accept': 'application/vnd.github.v3+json',
}

# Replace 'YOUR_ORG' with your target organization
org_name = 'datasets'
base_url = f'https://api.github.com/orgs/{org_name}/repos'

def fetch_repos(url):
    repos = []
    while url:
        print(f"Fetching: {url}")
        response = requests.get(url, headers=headers)
        page_repos = response.json()
        if not page_repos or "message" in page_repos:
            break
        repos.extend(page_repos)
        if 'next' in response.links:
            url = response.links['next']['url']
        else:
            url = None
    return repos

# Fetch all repositories handling pagination
repos = fetch_repos(f'{base_url}?per_page=100')

# Process and transform the data
transformed_data = [
    {"full_name": repo["full_name"], "branch": repo["default_branch"]}
    for repo in repos
]

# Save the results into a JSON file
with open('repo_list.json', 'w') as f:
    json.dump(transformed_data, f, indent=4)

print(f"Data saved to repo_list.json")
