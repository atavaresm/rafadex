import pytest

from bump_version import bumpVersion, checkVersion, formatVersion, parseVersion


def testParseVersionThreePart():
    assert parseVersion("v1.7.1") == (1, 7, 1)


def testParseVersionTwoPartPadsPatch():
    assert parseVersion("v1.7") == (1, 7, 0)


def testParseVersionStripsWhitespace():
    assert parseVersion("v1.7.1\n") == (1, 7, 1)


def testParseVersionRejectsMissingVPrefix():
    with pytest.raises(ValueError):
        parseVersion("1.7.1")


def testParseVersionRejectsNonNumericParts():
    with pytest.raises(ValueError):
        parseVersion("v1.x.1")


def testParseVersionRejectsWrongPartCount():
    with pytest.raises(ValueError):
        parseVersion("v1")
    with pytest.raises(ValueError):
        parseVersion("v1.2.3.4")


def testFormatVersionRoundTrips():
    assert formatVersion((1, 7, 1)) == "v1.7.1"


def testBumpPatch():
    assert bumpVersion((1, 7, 1), "patch") == (1, 7, 2)


def testBumpMinorResetsPatch():
    assert bumpVersion((1, 7, 9), "minor") == (1, 8, 0)


def testBumpMajorResetsMinorAndPatch():
    assert bumpVersion((1, 7, 9), "major") == (2, 0, 0)


def testBumpRejectsUnknownSize():
    with pytest.raises(ValueError):
        bumpVersion((1, 0, 0), "banana")


def testCheckVersionAcceptsIncrease():
    checkVersion((1, 7, 1), (1, 7, 0))  # must not raise


def testCheckVersionRejectsUnchanged():
    with pytest.raises(ValueError):
        checkVersion((1, 7, 0), (1, 7, 0))


def testCheckVersionRejectsDecrease():
    with pytest.raises(ValueError):
        checkVersion((1, 6, 9), (1, 7, 0))
