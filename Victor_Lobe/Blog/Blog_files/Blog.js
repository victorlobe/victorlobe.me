// Created by iWeb 3.0.2 local-build-20241018

setTransparentGifURL('../Media/transparent.gif');function applyEffects()
{var registry=IWCreateEffectRegistry();registry.registerEffects({reflection_0:new IWReflection({opacity:0.50,offset:1.00})});registry.applyEffects();}
function hostedOnDM()
{return false;}
function photocastSubscribe()
{photocastHelper("http://www.victorlobe.me/Victor_Lobe/Blog/rss.xml");}
function onPageLoad()
{loadMozillaCSS('Blog_files/BlogMoz.css')
adjustLineHeightIfTooBig('id1');adjustFontSizeIfTooBig('id1');adjustLineHeightIfTooBig('id2');adjustFontSizeIfTooBig('id2');detectBrowser();adjustLineHeightIfTooBig('id4');adjustFontSizeIfTooBig('id4');fixupAllIEPNGBGs();Widget.onload();fixAllIEPNGs('../Media/transparent.gif');fixupIECSS3Opacity('id3');applyEffects()}
function onPageUnload()
{Widget.onunload();}
