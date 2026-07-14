def turkish_lower(text: str) -> str:
    """str.lower() Türkçe İ/I harflerini yanlış çevirir (örn. 'TAŞINMAZ' -> 'taşinmaz',
    doğrusu 'taşınmaz'); bu yüzden İ/I'yı önce elle değiştirip sonra lower() uyguluyoruz."""
    return text.replace("İ", "i").replace("I", "ı").lower()
