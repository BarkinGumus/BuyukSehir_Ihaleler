from scraper.models import TenderType


def turkish_lower(text: str) -> str:
    """str.lower() Türkçe İ/I harflerini yanlış çevirir (örn. 'TAŞINMAZ' -> 'taşinmaz',
    doğrusu 'taşınmaz'); bu yüzden İ/I'yı önce elle değiştirip sonra lower() uyguluyoruz."""
    return text.replace("İ", "i").replace("I", "ı").lower()


_TYPE_KEYWORDS = (
    ("hizmet alımı", TenderType.HIZMET_ALIMI),
    ("hizmeti alınacaktır", TenderType.HIZMET_ALIMI),
    ("mal alımı", TenderType.MAL_ALIMI),
    ("yapım işi", TenderType.YAPIM_ISI),
    ("taşınmaz satışı", TenderType.TASINMAZ_SATIS),
    ("kiralama", TenderType.KIRALAMA),
    ("kiraya ver", TenderType.KIRALAMA),
    ("kat karşılığı", TenderType.KAT_KARSILIGI),
)


def turkish_title(text: str) -> str:
    """Tek kelimelik metinleri (il adı gibi) Türkçe kurallarına göre baş harfi
    büyük, geri kalanı küçük yapar (örn. 'İSTANBUL'/'istanbul' -> 'İstanbul').
    str.title()/str.capitalize() burada da aynı İ/I sorununu yaşar."""
    lowered = turkish_lower(text)
    if not lowered:
        return lowered
    first, rest = lowered[0], lowered[1:]
    if first == "i":
        first = "İ"
    elif first == "ı":
        first = "I"
    else:
        first = first.upper()
    return first + rest


_TURKISH_ALPHABET = "abcçdefgğhıijklmnoöprsştuüvyz"
_TURKISH_ORDER = {ch: i for i, ch in enumerate(_TURKISH_ALPHABET)}


def turkish_sort_key(text: str) -> list[int]:
    """Python'un varsayılan sıralaması Unicode kod noktasına göre çalışır, bu yüzden
    Ç/Ğ/İ/Ö/Ş/Ü ile başlayan kelimeler Z'den sonraya düşer (örn. 'Çorum' 'Bursa'dan
    sonra değil, listenin sonunda çıkar). Bu, harfleri gerçek Türkçe alfabe sırasındaki
    konumlarına eşleyip (C'den hemen sonra Ç gibi) doğru bir sıralama anahtarı üretir."""
    return [_TURKISH_ORDER.get(ch, 1000 + ord(ch)) for ch in turkish_lower(text)]


def classify_tender_type(text: str) -> TenderType:
    """Serbest metin içinde ihale türüne işaret eden anahtar kelimeleri arar."""
    lowered = turkish_lower(text)
    for keyword, tender_type in _TYPE_KEYWORDS:
        if keyword in lowered:
            return tender_type
    return TenderType.DIGER


_PROCEDURE_KEYWORDS = (
    ("açık ihale usulü", "Açık İhale Usulü"),
    ("belli istekliler arasında ihale usulü", "Belli İstekliler Arasında İhale Usulü"),
    ("açık teklif arttırma usulü", "Açık Teklif Arttırma Usulü"),
    ("açık teklif usulü", "Açık Teklif Usulü"),
    ("kapalı teklif usulü", "Kapalı Teklif Usulü"),
    ("pazarlık usulü", "Pazarlık Usulü"),
)


def extract_procedure(text: str) -> str | None:
    """Serbest metin içinde ihale usulüne (açık ihale, pazarlık vb.) işaret eden kalıpları arar."""
    lowered = turkish_lower(text)
    for keyword, display in _PROCEDURE_KEYWORDS:
        if keyword in lowered:
            return display
    return None
