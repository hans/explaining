import random

import names


def random_name(gender=None):
    """
    Draw a random first name (with balanced gender unless specified).

    Args:
        gender: "male" or "female"

    Returns:
        Tuple `(name, gender)`
    """

    if gender is None:
        gender = random.choice(("male", "female"))

    name = names.get_first_name(gender)
    return name, gender
