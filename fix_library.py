with open("client/src/components/Library.tsx", "r") as f:
    content = f.read()

content = content.replace("      if (res.ok) {\n        await fetchDocuments();\n      }", "      if (res.ok) {\n        const doc = await res.json();\n        onDocumentSelect(doc);\n      }")

with open("client/src/components/Library.tsx", "w") as f:
    f.write(content)
