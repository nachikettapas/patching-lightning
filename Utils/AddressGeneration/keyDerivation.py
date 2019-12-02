import sys
import hashlib
import hmac
from math import ceil
from hd import HDPrivateKey



hash_len = 32
def hmac_sha256(key, data):
    return hmac.new(key, data, hashlib.sha256).digest()

def hkdf(length, ikm, salt=b"", info=b""):
    prk = hmac_sha256(salt, ikm)
    t = b""
    okm = b""
    for i in range(ceil(length / hash_len)):
        t = hmac_sha256(prk, t + info + bytes([1+i]))
        okm += t
    return okm[:length]

def get_private_key(args):
    hsm_secret_as_hex = args[1]
    hsm_secret = bytes.fromhex(hsm_secret_as_hex)
    bip32_seed = hkdf(32, hsm_secret, b"\x00", b"bip32 seed")
    #print(bip32_seed.hex())
    master_extkey = HDPrivateKey.from_seed(bip32_seed, b"m/0/0/0", True)
    sk = hex(master_extkey.private_key.secret)[2:]
    sys.stdout.write(sk)
    sys.stdout.flush()
    #print('pub_key = ' ,master_extkey.pub.point)

get_private_key(sys.argv)