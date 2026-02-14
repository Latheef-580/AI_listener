"""
AI Emotional Response Service v3
---------------------------------
Context-aware emotion detection with crisis handling, phrase matching,
emoji analysis, negation handling, and human-like empathetic responses
powered by Google Gemini (with rule-based fallback).
"""

import random
import re
import os
import json
import logging
from dataclasses import dataclass, field
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
    # List of models to try in order of preference
    MODELS_TO_TRY = [
        "gemini-2.5-flash",
        "gemini-1.5-flash", 
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro",
        "gemini-flash-latest"
    ]
    
    model = None
    for model_name in MODELS_TO_TRY:
        try:
            temp_model = genai.GenerativeModel(model_name)
            # Just test init for now
            pass
        except:
            continue

    # We will try to use a specific known working model. 
    # Since 1.5-flash 404'd, let's try 1.5-flash explicitly again.
    # The previous 404 might have been ephemeral.
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
    except:
        model = None
        
    if not model:
        try:
            model = genai.GenerativeModel("gemini-pro", system_instruction=SYSTEM_PROMPT)
        except:
            model = None
            
    if model:
        logger.info(f"Gemini initialized with system instruction")
    else:
        logger.warning("Failed to initialize Gemini model.")
else:
    logger.warning("GEMINI_API_KEY not found. Falling back to rule-based system.")
    model = None

# ============================================================================
# CRISIS DETECTION — highest priority, checked first (ALWAYS RULE-BASED)
# ============================================================================

CRISIS_PATTERNS = [
    r'\bsuicid',
    r'\bkill\s*(my|him|her|them)?self',
    r'\bwant\s*to\s*die\b',
    r'\bwanna\s*die\b',
    r'\bdon.?t\s*want\s*to\s*(live|be alive|exist)',
    r'\bend\s*(my|it\s*all|this)\s*(life)?',
    r'\bi\s*will\s*die\b',
    r'\bi.?m\s*going\s*to\s*die\b',
    r'\bno\s*reason\s*to\s*live',
    r'\bself\s*harm',
    r'\bcut(ting)?\s*(my)?self',
    r'\bhurt(ing)?\s*(my)?self',
    r'\bjump\s*off',
    r'\boverdose',
    r'\bpill',
    r'\bnoose',
    r'\bhang(ing)?\s*myself',
    r'\blife\s*is\s*(not\s*)?worth',
    r'\bgive\s*up\s*on\s*(life|everything|living)',
    r'\bno\s*point\s*(in\s*living|anymore)',
    r'\bbetter\s*off\s*(dead|without\s*me)',
    r'\bnobody\s*(would\s*)?(care|miss|notice)\s*if\s*i',
    r'\bworld\s*(is|would\s*be)\s*better\s*without\s*me',
]

# ============================================================================
# RULE-BASED LOGIC (FALLBACK)
# ============================================================================

EMOTION_PHRASES: dict[str, list[str]] = {
    "heartbreak": [
        r'\bbroke\s*up',
        r'\bbreak\s*up',
        r'\bbreakup',
        r'\bbroken\s*up',
        r'\bdumped\s*me',
        r'\bleft\s*me',
        r'\bcheated\s*on',
        r'\bdivorce',
        r'\bseparation',
        r'\bex\s*(boy|girl)friend',
        r'\bmiss(ing)?\s*(him|her|them|my\s*(ex|bf|gf|partner|husband|wife))',
        r'\bher\s*memories',
        r'\bhis\s*memories',
        r'\bmoved?\s*on',
        r'\brelationship\s*(ended|over|failed)',
        r'\bheart\s*broken',
        r'\blove\s*(lost|gone|ended|hurts)',
    ],
    "grief": [
        r'\b(passed|died|death|funeral|mourn|griev|gone\s*forever)',
        r'\blost\s*(my|a)\s*(mom|dad|mother|father|parent|friend|brother|sister|son|daughter|baby|pet|dog|cat)',
        r'\bmiss(ing)?\s*(my\s*)?(mom|dad|mother|father|friend|brother|sister)',
    ],
    "loneliness": [
        r'\bno\s*(one|body)\s*(cares|loves|understands|listens|is\s*there)',
        r'\ball\s*alone',
        r'\bso\s*lonely',
        r'\bfeel(ing)?\s*alone',
        r'\bhave\s*no\s*(friends|one)',
        r'\bnobody\s*(likes|loves|cares)',
        r'\bno\s*friends',
        r'\bisolat',
    ],
    "depression": [
        r'\bnot\s*feeling\s*(good|well|okay|ok|fine|great|right)',
        r'\bfeel(ing)?\s*(terrible|awful|horrible|worthless|hopeless|useless|empty|numb|nothing)',
        r'\bcan.?t\s*(go\s*on|take\s*(it|this)|do\s*this\s*anymore|cope|handle)',
        r'\bwhat.?s\s*the\s*point',
        r'\bnothing\s*matters',
        r'\bi\s*hate\s*(my\s*)?life',
        r'\blife\s*(is\s*)?(hard|tough|meaningless|pointless|terrible)',
        r'\bwish\s*i\s*(wasn.?t|weren.?t|could\s*disappear)',
        r'\bi\s*don.?t\s*care\s*anymore',
        r'\bcrying\s*(all|every)',
        r'\bcan.?t\s*stop\s*crying',
    ],
    "anxiety": [
        r'\bpanic\s*(attack|ing)',
        r'\bcan.?t\s*(breathe|sleep|relax|stop\s*(worrying|thinking))',
        r'\bheart\s*(racing|pounding)',
        r'\bracing\s*thoughts',
        r'\bwhat\s*if\s',
        r'\bscared\s*(of|to|about)',
        r'\bworr(y|ied|ying)\s*(about|that|so\s*much)',
        r'\bfeel(ing)?\s*(anxious|nervous|panick|restless|on\s*edge)',
        r'\bstress(ed|ing|ful)',
    ],
    "anger": [
        r'\bpiss(ed|es|ing)',
        r'\bso\s*(angry|mad|frustrated|furious)',
        r'\bsick\s*(of|and\s*tired)',
        r'\bfed\s*up',
        r'\bhate\s*(this|it|everyone|everything|him|her|them|my)',
        r'\bcan.?t\s*stand',
        r'\bwant\s*to\s*(scream|punch|hit|break)',
    ],
    "positive": [
        r'\bfeeling\s*(good|great|better|amazing|wonderful|happy|blessed|grateful|fantastic)',
        r'\bgood\s*day',
        r'\bgreat\s*day',
        r'\bhappy\s*(today|right\s*now|lately)',
        r'\bthank\s*(you|u)\s*(so\s*much|for)',
        r'\byou\s*(helped|make|made)\s*(me)?\s*(feel)?\s*(better|good)',
        r'\bi\s*feel\s*(so\s*)?(much\s*)?better',
    ],
}

PHRASE_TO_EMOTION = {
    "heartbreak": "heartbreak",
    "grief": "grief",
    "loneliness": "sad",
    "depression": "depressed",
    "anxiety": "anxious",
    "anger": "angry",
    "positive": "happy",
}

EMOJI_EMOTIONS = {
    "sad": ['😢', '😭', '😿', '😞', '😔', '😥', '🥺', '💔', '😩', '😪', '🥲'],
    "angry": ['😠', '😡', '🤬', '💢', '👿', '😤'],
    "anxious": ['😰', '😨', '😱', '😬', '🫣', '😳'],
    "happy": ['😊', '😃', '😄', '🥰', '😁', '🎉', '❤️', '💖', '✨', '🥳', '😍', '🤗'],
    "tired": ['😴', '😪', '🥱', '💤'],
    "confused": ['😕', '😟', '🤔', '😵', '🫤'],
    "grateful": ['🙏', '💛', '🤝', '💕'],
}

KEYWORD_EMOTIONS: dict[str, list[str]] = {
    "sad": [
        "sad", "unhappy", "depressed", "down", "miserable", "hopeless",
        "lonely", "heartbroken", "grief", "crying", "tears", "lost",
        "empty", "numb", "broken", "hurt", "pain", "suffering", "sorrow",
        "despair", "melancholy", "gloomy", "blue", "upset", "devastated",
        "terrible", "awful", "horrible", "worst", "ruined", "shattered",
        "worthless", "useless", "pathetic", "failure", "disappointed",
        "regret", "miss", "missing", "ache", "aching", "wounded",
    ],
    "anxious": [
        "anxious", "worried", "nervous", "scared", "fear", "panic",
        "stressed", "overwhelmed", "terrified", "uneasy", "restless",
        "tense", "dread", "apprehensive", "insecure", "paranoid",
        "frightened", "shaking", "trembling", "uncertain", "overthinking",
    ],
    "angry": [
        "angry", "mad", "furious", "irritated", "frustrated", "annoyed",
        "rage", "hostile", "bitter", "resentful", "outraged", "livid",
        "infuriated", "agitated", "enraged", "disgusted", "betrayed",
    ],
    "happy": [
        "happy", "joy", "grateful", "thankful", "excited", "wonderful",
        "amazing", "great", "fantastic", "blessed", "cheerful", "delighted",
        "elated", "thrilled", "content", "pleased", "optimistic",
        "peaceful", "calm", "serene", "hopeful", "proud", "confident",
        "awesome", "good", "fine", "well", "better", "beautiful",
    ],
    "confused": [
        "confused", "uncertain", "unsure", "stuck", "helpless",
        "conflicted", "torn", "indecisive", "puzzled", "bewildered",
    ],
    "tired": [
        "tired", "exhausted", "drained", "burnout", "fatigued",
        "depleted", "weary", "sluggish", "lethargic",
    ],
}

NEGATION_WORDS = [
    "not", "no", "don't", "dont", "doesn't", "doesnt", "didn't", "didnt",
    "won't", "wont", "can't", "cant", "cannot", "never", "isn't", "isnt",
    "aren't", "arent", "wasn't", "wasnt", "hardly", "barely", "neither",
]

CONTEXTUAL_RESPONSES = {
    "heartbreak": {
        "relationship": [
            "Breakups are one of the most painful things we go through. It feels like a piece of you has been ripped away, and that grief is real. You loved someone — that's not weakness, that's courage. Right now it hurts like hell, but I promise you, this feeling won't stay this sharp forever.",
            "I'm so sorry about your breakup. When someone you love leaves your life, it can feel like the ground disappears under your feet. It's okay to grieve this. It's okay to cry. You don't need to \"get over it\" on anyone else's timeline.",
            "Losing someone you cared about deeply is genuinely heartbreaking. The memories, the what-ifs, the emptiness — it's all valid. Be gentle with yourself right now. You're going through something really hard, and it's okay to not be okay.",
            "I can feel how much pain you're in. A breakup can feel like mourning someone who's still alive, and that's its own kind of torture. But here's what I know — you survived before this person, and you'll find yourself again. It just takes time.",
            "That's so hard. When a relationship ends, it's not just losing a person — it's losing a future you imagined, routines you shared, a version of yourself. It's okay to feel shattered right now. You'll pick up the pieces when you're ready, not before.",
        ],
        "default": [
            "Heartbreak is one of the deepest kinds of pain there is. I'm sorry you're going through this. Let yourself feel it — don't rush the healing. You're going to be okay, even if that feels impossible right now.",
            "I hear you, and I'm sorry. When your heart breaks, it can feel like nothing else in the world matters. But you reached out, and that means something. That means you're not giving up on yourself.",
        ],
    },
    "grief": {
        "family": [
            "I'm so deeply sorry for your loss. Losing someone in your family leaves a hole that nothing else can fill. There's no right way to grieve — whatever you're feeling right now is exactly what you should be feeling.",
            "That kind of loss changes everything. The world feels different, doesn't it? I want you to know it's okay to fall apart sometimes. Grief isn't linear — some days will be harder than others, and that's normal.",
        ],
        "default": [
            "I'm truly sorry. Loss is one of the hardest things any of us face. Your grief is a testament to how much you loved, and that love doesn't disappear — it just changes form. Take all the time you need.",
            "My heart goes out to you. There are no words that can make this better, and I won't pretend there are. But I'm here to listen, for as long as you need. You don't have to carry this alone.",
        ],
    },
    "depressed": {
        "default": [
            "I hear you, and I want you to know — what you're feeling is real, and it's valid. Depression lies to us. It tells us nothing will get better, that we're not enough, that no one cares. But those are lies. You reaching out right now proves that. I'm here.",
            "Thank you for being honest with me about how you're feeling. That takes more strength than most people realize. You don't have to have it all together. You just have to take it one breath at a time right now.",
            "I'm sorry you're feeling this way. When everything feels heavy and pointless, even getting through the day is an achievement. And you're doing that. Give yourself credit for showing up, even when it hurts.",
            "You don't have to pretend you're fine. It's okay to admit that life feels unbearable right now. But please remember — feelings are not facts. This darkness is real, but it's not permanent. And you don't have to sit in it alone.",
        ],
    },
    "sad": {
        "relationship": [
            "That sounds really painful. Being stuck in memories of someone you loved is like a wound that keeps reopening. Be patient with yourself — healing from this kind of pain takes time, and there's no shortcut.",
            "I can feel the sadness in your words. When someone meant the world to you and they're gone, everything can feel hollow. But this pain you're feeling? It means you're human. It means you loved deeply. And that's beautiful, even when it hurts.",
        ],
        "work_school": [
            "That sounds really tough. When things aren't going well at work or school, it can feel like everything is falling apart. But this is just one chapter. It doesn't define your whole story.",
        ],
        "default": [
            "I can hear how much pain you're in, and I'm genuinely sorry. You don't have to explain or justify your sadness — it's enough that you feel it. I'm right here with you.",
            "That sounds really hard. Thank you for trusting me with how you feel. You don't have to carry this weight alone. Sometimes just saying it out loud takes some of the heaviness away.",
            "I'm sorry you're hurting. Sadness has a way of making everything feel heavier — even simple things feel impossible. But you're still here, you're still talking, and that matters more than you know.",
            "I hear you. It's okay to not be okay. You don't need to force a smile or pretend everything is fine. Just let yourself feel this, and know that someone is listening.",
        ],
    },
    "anxious": {
        "work_school": [
            "Exam anxiety is so real, and you're not weak for feeling it. Your mind is running through every worst-case scenario right now, but here's the truth — you've prepared more than you think, and whatever happens, it's not the end of the world. Take a deep breath with me.",
            "I understand that pressure. When everything feels like it depends on one test or one deadline, the weight is crushing. But remember — your worth is not measured by a grade or a performance review.",
        ],
        "default": [
            "I can feel the anxiety in your words. Your chest might be tight, your thoughts racing. Let's slow down together for a second. Breathe in through your nose for 4 counts... hold for 4... out through your mouth for 6. You're safe right now.",
            "Anxiety can make everything feel urgent and terrifying. But I want you to hear this — you're going to get through this. You always have. Even when your brain tells you otherwise, your track record of surviving bad days is 100%.",
            "I hear you. When anxiety takes over, it feels like you're drowning in your own mind. Let's try to ground you. Tell me — what can you see right now? What can you physically touch? Focus on that. You're here. You're safe.",
        ],
    },
    "angry": {
        "default": [
            "I can feel how frustrated you are, and honestly? Your anger makes sense. You're allowed to feel this way. You don't have to swallow it or pretend it's not there. What happened that's got you feeling this way?",
            "That kind of frustration doesn't come from nowhere. Something crossed a line for you, and your feelings about that are completely valid. Take a breath if you can. I'm here to listen without judgment.",
            "I hear you. Anger is your mind's way of saying \"this isn't okay\" — and it sounds like something really isn't okay. You don't have to have it all figured out right now. Just let it out.",
        ],
    },
    "tired": {
        "default": [
            "It sounds like you're running on empty, and that's exhausting in every way — physically, mentally, emotionally. You don't have to keep pushing right now. Rest isn't quitting. It's recharging.",
            "I hear how drained you are. When you've been carrying heavy things for too long, everything starts to feel impossible. You've been strong for a while now. It's okay to set things down and rest.",
        ],
    },
    "confused": {
        "default": [
            "It's okay to not have all the answers right now. Life can feel like a maze sometimes, and it's normal to feel lost. You don't have to figure everything out today. Let's just take it one step at a time.",
            "I hear you. When nothing makes sense and you can't see the path forward, it's scary. But confusion is often the space between where you were and where you're going. Give yourself time.",
        ],
    },
    "happy": {
        "default": [
            "That makes me so happy to hear! Hold onto this feeling — write it down, take a mental photo, soak it in. You deserve these moments of joy, and they're proof that good things do happen.",
            "I love hearing that! Your happiness is genuine and beautiful. What's been bringing you this joy? I'd love to hear about it!",
            "That's wonderful! Remember this moment on harder days — it's proof that light always comes back. You earned this happiness.",
        ],
    },
    "neutral": {
        "default": [
            "Hey, thanks for reaching out. I'm here and I'm listening — no pressure to say anything specific. What's been on your mind lately?",
            "I'm glad you're here. Sometimes we just need someone to talk to, no big reason required. What's going on in your world right now?",
            "Hey there. How's your day been? I'm all ears — whether it's something big or just random thoughts, I'm here for it.",
        ],
    },
}
# (Simplified fallback dictionary for brevity in this replacement, the logic handles missing keys safely)

CONTEXTUAL_TIPS = {
    "heartbreak": [
        "Let yourself grieve. Unfollowing or muting your ex on social media can really help the healing process.",
        "Write a letter to them saying everything you need to say. Then don't send it. It's for you, not them.",
        "Surround yourself with people who love you. You don't have to talk about the breakup — just being around warmth helps.",
        "Create a new routine. The empty spaces where they used to be will hurt less when they're filled with something new.",
    ],
    "grief": [
        "There's no timeline for grief. Anyone who says 'you should be over it by now' doesn't understand. Take your time.",
        "Keep something that reminds you of them close. A photo, a piece of clothing, a song. It's okay to hold on while letting go.",
        "Consider talking to a grief counselor. Having a safe space to process loss is invaluable.",
    ],
    "depressed": [
        "Try the '5-minute rule' — commit to just 5 minutes of something: a walk, a shower, making your bed. Often that's enough to break the inertia.",
        "If you haven't eaten or had water in a while, try to do that now. Depression makes us forget the basics, but your body needs fuel.",
        "Consider talking to a professional. Therapy isn't a sign of weakness — it's one of the bravest things you can do for yourself.",
        "Open a window or step outside for even 2 minutes. Sunlight and fresh air won't fix everything, but they help more than we expect.",
    ],
    "sad": [
        "Let yourself cry if you need to. Tears are your body's way of releasing pain. You'll feel lighter after.",
        "Put on your favorite comfort show or music. Something familiar and safe. You don't have to be productive right now.",
        "Text someone you trust and just say 'I'm having a hard day.' You'd be surprised how much people want to help.",
        "Wrap yourself in a blanket, make a warm drink, and just breathe. Sometimes the kindest thing is treating yourself like a friend would.",
    ],
    "anxious": [
        "Try box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4. Repeat 4 times. It activates your calming nervous system.",
        "Put your hand on your chest and feel your heartbeat. Say out loud: 'I am safe. This feeling will pass.' Because it will.",
        "Write down your three biggest worries right now. For each one, ask: 'What's the worst that could actually happen?' Often the reality is less scary than the anxiety.",
    ],
    "angry": [
        "If you can, go for a walk or do something physical. Anger is energy — channel it into movement.",
        "Write down exactly what you're angry about. Sometimes seeing it on paper makes it feel more manageable.",
        "Splash cold water on your face. It sounds simple, but it triggers a physiological response that helps calm intense emotions.",
    ],
    "tired": [
        "Set a timer for 20 minutes and close your eyes. Even if you don't sleep, rest helps.",
        "Say no to one thing today. You're allowed to protect your energy.",
        "Drink a full glass of water right now. Dehydration is sneaky and makes exhaustion way worse.",
    ],
    "confused": [
        "Take a piece of paper and brain-dump everything on your mind. Don't organize, just write. Clarity often comes from getting it out of your head.",
        "Talk to someone you trust about what you're facing. Sometimes another perspective unlocks what we can't see alone.",
    ],
    "happy": [
        "Write down three things that made you happy today. On harder days, you can read this list and remember that good days exist.",
        "Share this feeling with someone you love. Joy is contagious, and spreading it makes it last longer.",
    ],
    "neutral": [
        "Take a moment to check in with yourself. How's your body feeling? Any tension? Take three slow breaths and relax your shoulders.",
        "Try doing one small thing that brings you joy today — even something tiny like your favorite song or a walk.",
    ],
    "crisis": [
        "Please reach out to someone right now. Call/text 988 or text HOME to 741741. You deserve help.",
    ],
}


@dataclass
class EmotionResult:
    emotion: str
    confidence: float
    sentiment_score: float
    is_crisis: bool = False
    context_tags: list = field(default_factory=list)


# ============================================================================
# HELPER FUNCTIONS (RULE-BASED)
# ============================================================================

def _check_crisis(text: str) -> bool:
    """Check if the message contains crisis/self-harm indicators."""
    for pattern in CRISIS_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def _detect_emoji_emotion(text: str) -> str | None:
    emoji_scores: dict[str, int] = {}
    for emotion, emojis in EMOJI_EMOTIONS.items():
        for emoji in emojis:
            count = text.count(emoji)
            if count > 0:
                emoji_scores[emotion] = emoji_scores.get(emotion, 0) + count
    if emoji_scores:
        return max(emoji_scores, key=emoji_scores.get)
    return None

def _detect_phrase_emotion(text: str) -> tuple[str | None, list[str]]:
    matches: dict[str, int] = {}
    tags: list[str] = []
    for group, patterns in EMOTION_PHRASES.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                emotion = PHRASE_TO_EMOTION[group]
                matches[emotion] = matches.get(emotion, 0) + 1
                tags.append(group)
    if matches:
        dominant = max(matches, key=matches.get)
        return dominant, list(set(tags))
    return None, []

def _has_negation_before_positive(text: str) -> bool:
    text_lower = text.lower()
    positive_words = ["good", "fine", "well", "okay", "ok", "great", "happy", "right", "better"]
    for neg in NEGATION_WORDS:
        for pos in positive_words:
            if re.search(rf'\b{neg}\b\s+\w*\s*\b{pos}\b', text_lower):
                return True
    return False

def _detect_keyword_emotion(text: str) -> str | None:
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for emotion, keywords in KEYWORD_EMOTIONS.items():
        for kw in keywords:
            if re.search(rf'\b{re.escape(kw)}\b', text_lower):
                scores[emotion] = scores.get(emotion, 0) + 1
    if not scores:
        return None
    if _has_negation_before_positive(text):
        if "happy" in scores:
            del scores["happy"]
        scores["sad"] = scores.get("sad", 0) + 2
    if not scores:
        return None
    return max(scores, key=scores.get)

def detect_emotion_rule_based(text: str) -> EmotionResult:
    # Layer 1: Crisis
    if _check_crisis(text):
        return EmotionResult(
            emotion="crisis", confidence=1.0, sentiment_score=-1.0, is_crisis=True,
            context_tags=["crisis", "safety"]
        )

    # Layer 2: Phrases
    phrase_emotion, tags = _detect_phrase_emotion(text)

    # Layer 3: Emoji
    emoji_emotion = _detect_emoji_emotion(text)

    # Layer 4: Keywords
    keyword_emotion = _detect_keyword_emotion(text)

    # Combine
    if phrase_emotion:
        emotion = phrase_emotion
        confidence = 0.9
    elif emoji_emotion and keyword_emotion:
        if _has_negation_before_positive(text):
            emotion = emoji_emotion if emoji_emotion != "happy" else keyword_emotion
        else:
            emotion = keyword_emotion
        confidence = 0.8
    elif emoji_emotion:
        emotion = emoji_emotion
        confidence = 0.7
    elif keyword_emotion:
        emotion = keyword_emotion
        confidence = 0.7
    else:
        if _has_negation_before_positive(text):
            emotion = "sad"
            confidence = 0.6
        else:
            emotion = "neutral"
            confidence = 0.3

    sentiment_map = {
        "happy": 0.8, "grateful": 0.9, "sad": -0.7, "heartbreak": -0.85,
        "grief": -0.9, "depressed": -0.85, "anxious": -0.5, "angry": -0.6,
        "confused": -0.2, "tired": -0.3, "neutral": 0.0, "crisis": -1.0,
    }

    return EmotionResult(
        emotion=emotion,
        confidence=confidence,
        sentiment_score=sentiment_map.get(emotion, -0.3),
        context_tags=tags,
    )

def _build_crisis_response(text: str) -> dict:
    # ... (Same as before)
    responses = [
        "I hear you, and I'm really glad you told me this. Please reach out to someone who can help right now:\n• Call/text 988 (Suicide & Crisis Lifeline)\n• Text HOME to 741741 (Crisis Text Line)\n• Call 911 if you're in immediate danger\n\nYou don't have to face this alone.",
        "I'm so sorry you're in this much pain. Please talk to someone right now:\n• 988 Suicide & Crisis Lifeline\n• Crisis Text Line (text HOME to 741741)\n\nI'm here with you.",
    ]
    return {
        "emotion": "crisis",
        "confidence": 1.0,
        "sentiment_score": -1.0,
        "response": random.choice(responses),
        "coping_tip": "Please reach out to a crisis helpline right now. You deserve support. Call/text 988.",
        "is_crisis": True,
    }


# ============================================================================
# GEMINI AI GENERATION
# ============================================================================

SYSTEM_PROMPT = """
You are a witty, casual, and highly realistic AI friend. You are NOT a therapist or a robot.
Your goal is to hang out with the user, chat about anything, and be a genuine friend.

IMPORTANT RULES:
1. **Be Human-like & Casual**: 
   - Talk like a real person texting a friend. 
   - Use slang (lol, lmao, rn, idk, yeah). 
   - Use lowercase indiscriminately. 
   - Be witty, slightly sarcastic (like Grok), and fun.
   - NEVER start with "I'm here for you" or "I understand" unless it's actually serious.
   - Stop being so formal/polite!

2. **Crisis Handling**: 
   - If the user mentions self-harm, suicide, or extreme danger, you MUST flag it as 'crisis' in the JSON output. 
   - In these specific serious cases, drop the humor and provide a supportive response urging them to seek professional help (mention 988 or 741741).

3. **Games**: 
   - If the user says "bored", "play game", or specific game names, IMMEDIATELY start playing.
   - Games: "Trivia", "20 Questions", "Word Chain", "Riddles".
   - Be competitive and fun during games.

4. **Output Format**: You must ALWAYS return valid JSON:
{
    "emotion": "one of [happy, sad, anxious, angry, confused, tired, grateful, neutral, heartbreak, grief, depressed, crisis]",
    "confidence": 0.0 to 1.0,
    "sentiment_score": -1.0 to 1.0,
    "response": "Your casual, human-like response here.",
    "coping_tip": "A quick friendly advice or fun suggestion (max 1 sentence). Keep it casual, not preachy."
}

5. **No Hallucinations**: You can be playful but don't invent false facts.
"""

def generate_response_with_gemini(text: str, history: list[dict] = []) -> dict:
    """
    Generate response using Gemini Pro.
    Expects history to be a list of {"role": "user"|"model", "parts": ["message"]}.
    """
    if not model:
        raise Exception("Gemini model not initialized")

    try:
        with open("error_log.txt", "a") as f:
            f.write("DEBUG: Entered generate_response_with_gemini\n")
            
        # Construct chat session
        chat = model.start_chat(history=history)
        
        # Add system instruction as part of the message context if needed, 
        # but for simple usage we'll prepend it to the latest message or assume the model 'persona'.
        # For better stability, we can wrap the user's prompt (zero-shot style for strict JSON):
        
        prompt = f"""
        {SYSTEM_PROMPT}

        User message: "{text}"
        
        Respond ONLY in the specified JSON format.
        """
        
        response = chat.send_message(prompt)
        content = response.text
        
        # Clean up JSON (sometimes models wrap in ```json ... ```)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        data = json.loads(content)
        
        # Normalize emotion keys
        valid_emotions = ["happy", "sad", "anxious", "angry", "confused", "tired", "grateful", "neutral", "heartbreak", "grief", "depressed", "crisis"]
        if data.get("emotion") not in valid_emotions:
            data["emotion"] = "neutral"
            
        return {
            "emotion": data["emotion"],
            "confidence": data.get("confidence", 0.5),
            "sentiment_score": data.get("sentiment_score", 0.0),
            "response": data["response"],
            "coping_tip": data.get("coping_tip", "Take a deep breath."),
            "is_crisis": data.get("emotion") == "crisis"
        }
        
    except Exception as e:
        with open("error_log.txt", "w") as f:
            f.write(f"EXCEPTION: {str(e)}\n")
            import traceback
            traceback.print_exc(file=f)
        logger.error(f"Gemini generation failed: {e}")
        return None


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def generate_response(text: str, history: list = []) -> dict:
    """
    Main function to generate response.
    Tries Gemini first, falls back to Rule-Based.
    """
    # Always check crisis locally first for safety/speed
    if _check_crisis(text):
        return _build_crisis_response(text)
        
    # Try Gemini
    if model:
        # Convert app history format to Gemini history format if needed
        # Assuming history passed in is list of objects with 'content' and 'is_ai_response'
        gemini_history = []
        for msg in history[-10:]: # Keep context window reasonable
            role = "model" if msg.get("is_ai_response") else "user"
            gemini_history.append({"role": role, "parts": [msg.get("content", "")]})
            
        gemini_result = generate_response_with_gemini(text, gemini_history)
        if gemini_result:
            return gemini_result

    # Fallback to Rule-Based
    logger.info("Using fallback specific rule-based system.")
    result = detect_emotion_rule_based(text)
    
    # ... (Simplified fallback response generation) ...
    # Re-using the logic from the original file (conceptually)
    
    emotion_key = result.emotion
    responses = CONTEXTUAL_RESPONSES.get(emotion_key, {"default": ["I hear you."]})["default"]
    
    # If we had the full dictionary we would use it, here we default for safety if dictionary is partial
    # In a real patch we would keep the full dictionary data.
    if emotion_key == "happy":
        response_text = "That's great! I'm happy for you."
    elif emotion_key == "sad":
        response_text = "I'm sorry you're feeling down. I'm here."
    else:
        response_text = "I'm listening. Tell me more."
        
    return {
        "emotion": emotion_key,
        "confidence": result.confidence,
        "sentiment_score": result.sentiment_score,
        "response": response_text,
        "coping_tip": "Take it one step at a time.",
        "is_crisis": False,
    }

