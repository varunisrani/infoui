from mem0 import MemoryClient

# Initialize the MemoryClient with your API key
client = MemoryClient(api_key="m0-yRu8Nv1BLicUpumm76LfkLuXxHJ9qvu1T3Il9J5W")

# Example conversation messages
messages = [
    { "role": "user", "content": "Hi, I'm Alex. I'm a vegetarian and I'm allergic to nuts." },
    { "role": "assistant", "content": "Hello Alex! I see that you're a vegetarian with a nut allergy." }
]

print("Adding memories to mem0...")
# Add the conversation to memory for user "alex"
result = client.add(messages, user_id="alex")
print(f"Memory added: {result}")

print("\nSearching for dinner recommendations...")
# Search for relevant memories when asked about dinner
query = "What can I cook for dinner tonight?"
search_results = client.search(query, user_id="alex")
print(f"Search results: {search_results}")

# Additional example: Add more context
print("\nAdding more context...")
additional_messages = [
    { "role": "user", "content": "I also love Italian food and pasta dishes." },
    { "role": "assistant", "content": "Great! I'll remember that you enjoy Italian cuisine and pasta." }
]

client.add(additional_messages, user_id="alex")

# Search again with the new context
print("\nSearching again with updated memories...")
query2 = "Suggest a meal for me"
search_results2 = client.search(query2, user_id="alex")
print(f"Updated search results: {search_results2}")

# Get all memories for the user
print("\nAll memories for user 'alex':")
all_memories = client.get_all(user_id="alex")
print(f"All memories: {all_memories}") 