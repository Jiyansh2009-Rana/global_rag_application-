from typing import Dict, Any

def get_platform_guide_content() -> Dict[str, Any]:
    contact_email = "mcode1929@gmail.com"
    return {
        "title": "Welcome to the Enterprise RAG Platform",
        "introduction": (
            "This platform acts as your intelligent document assistant. "
            "You can securely upload your documents (PDFs, Word docs, Spreadsheets, Presentations, etc.) "
            "and ask AI questions to instantly find answers based strictly on your files."
        ),
        "how_to_use_steps": [
            {
                "step": 1,
                "title": "🔐 Create an Account & Log In",
                "description": "Start by signing up with your email. Once logged in, you'll be securely assigned to your organization's workspace."
            },
            {
                "step": 2,
                "title": "📂 Upload Documents (Local vs. Global)",
                "description": "You have two ways to upload documents, depending on your needs:",
                "details": {
                    "Local Mode (Private & Temporary)": "Perfect for sensitive, one-off analysis. Documents are visible ONLY to you and are permanently deleted after 1 hour.",
                    "Global Mode (Org-Wide)": "Available for Admins. Documents uploaded globally act as a shared knowledge base for everyone in your organization."
                }
            },
            {
                "step": 3,
                "title": "💬 Ask Questions (Querying)",
                "description": "Head over to the chat interface to ask questions. You can filter where the AI searches for answers:",
                "details": {
                    "Local": "Searches only your temporarily uploaded files.",
                    "Global": "Searches your organization's permanent knowledge base.",
                    "Both": "Searches across both your private session files and the organization's files."
                }
            },
            {
                "step": 4,
                "title": "📜 View Chat History",
                "description": "Whenever you ask questions in 'Global' or 'Both' modes, your chat history is safely stored. You can revisit your past questions and answers at any time in the History tab."
            }
        ],
        "tips_for_best_results": [
            "Be specific with your questions.",
            "If the AI doesn't know the answer, it will tell you. It will never make up information.",
            "You can ask the AI to answer in different languages!"
        ],
        "support": "If you need elevated access (like Global Upload permissions), please contact your Organization's Admin.",
        "contact": f"if you see any issue or you have any suggetion then contact this email {contact_email} "
    }
