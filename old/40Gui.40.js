function init_gui(){
    if (character.controller) return
    load_code('41CcMeter')
    load_code('43GoldMeter')
    load_code('44MiniMap')
    load_code('45PartyList')

    if (character.ctype == 'merchant') return
    load_code('42DpsMeter')
    load_code('47XpTillLevel')
}

init_gui()